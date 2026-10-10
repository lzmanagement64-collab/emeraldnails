// ============================================================
// Acompte en ligne (Stripe) — logique serveur (jamais envoyée au navigateur).
//
// Déroulé :
// 1. La cliente valide le formulaire : le rendez-vous est enregistré en
//    « réservation provisoire » (acompte_statut = en_attente) et la page de
//    paiement Stripe s'ouvre. Le créneau est bloqué 35 minutes.
// 2. Paiement reçu (webhook Stripe signé, ou vérification directe auprès de
//    Stripe au retour de la cliente) : acompte « payé », rendez-vous « à
//    valider » par Maria. E-mail « demande reçue, acompte payé » à la cliente,
//    alerte à Maria.
// 2 bis. Maria valide (e-mail de confirmation) ou refuse (acompte remboursé
//    intégralement, e-mail d'explication).
// 3. Pas de paiement à temps : le créneau est libéré automatiquement.
// 4. Annulation en ligne (plus de 72 h avant) : acompte remboursé.
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { adresseSite } from "./adresse-site.server";
import type { Database } from "@/integrations/supabase/types";
import { business } from "@/config/business";
import { getStripe, getStripeErrorMessage } from "./stripe.server";
import { POURCENT_ACOMPTE } from "./acompte";
import { SELECT_AVEC_PRESTATION, versEmail } from "./reservation.server";
import { parisLongDate, parisTime } from "./tz";

type Admin = SupabaseClient<Database>;

/** Temps laissé pour payer sur la page Stripe (Stripe impose 30 min minimum). */
export const DELAI_PAIEMENT_MIN = 30;
/** Marge avant de libérer le créneau, au cas où le paiement se termine à la dernière seconde. */
const MARGE_MIN = 5;

function echeances() {
  // +1 min : Stripe refuse une expiration à moins de 30 min pile.
  const finPaiement = new Date(Date.now() + (DELAI_PAIEMENT_MIN + 1) * 60_000);
  const finBlocage = new Date(finPaiement.getTime() + MARGE_MIN * 60_000);
  return { finPaiement, finBlocage };
}

/** Adresse du site vue par la cliente (aperçu Lovable ou site publié), pour le retour de Stripe. */
export const origineSite = adresseSite;

/** Fin de blocage d'une nouvelle réservation provisoire (enregistrée avant le paiement). */
export const finBlocageProvisoire = () => echeances().finBlocage;

/** Passe en « annulée » les réservations provisoires non payées dans le délai. */
export async function libererReservationsExpirees(admin: Admin) {
  const { data, error } = await admin
    .from("reservations")
    .update({ statut: "annulee", acompte_statut: "expire" })
    .eq("acompte_statut", "en_attente")
    .lt("acompte_expire_le", new Date().toISOString())
    .select("stripe_payment_intent");
  if (error) console.error("[acompte] libération des créneaux expirés", error.message);
  // Paiement intégré encore ouvert : il ne peut plus aboutir.
  for (const r of data ?? []) await annulerIntention(r.stripe_payment_intent);
}

/** Annule un paiement intégré qui n'a pas abouti (créneau libéré, refus…). */
export async function annulerIntention(id: string | null) {
  if (!id) return;
  await getStripe()
    .paymentIntents.cancel(id)
    .catch(() => undefined);
}

type RowIntention = {
  id: string;
  date_debut: string;
  cliente_email: string;
  acompte_montant: number | null;
  stripe_payment_intent: string | null;
  prestations_detail?: unknown;
  prestations: { nom: string } | null;
};

/**
 * Paiement intégré au site (Payment Element / Apple Pay / Google Pay) :
 * renvoie la clé de paiement (client secret) de l'acompte de ce rendez-vous,
 * en réutilisant le paiement en cours s'il est encore utilisable.
 */
export async function intentionPaiement(admin: Admin, row: RowIntention) {
  const stripe = getStripe();
  const centimes = Math.round(Number(row.acompte_montant ?? 0) * 100);
  if (centimes < 50) throw new Error("Montant d'acompte invalide.");

  if (row.stripe_payment_intent) {
    const actuel = await stripe.paymentIntents.retrieve(row.stripe_payment_intent);
    const reutilisable = [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "succeeded",
    ].includes(actuel.status);
    if (reutilisable && actuel.amount === centimes && actuel.client_secret) {
      return { clientSecret: actuel.client_secret, statut: actuel.status };
    }
  }

  const detail = Array.isArray(row.prestations_detail)
    ? (row.prestations_detail as { nom: string }[])
    : [];
  const nom = detail.length
    ? detail.map((l) => l.nom).join(" + ")
    : (row.prestations?.nom ?? "Prestation");
  const quand = `${parisLongDate(row.date_debut)} à ${parisTime(row.date_debut)}`;
  const intent = await stripe.paymentIntents.create(
    {
      amount: centimes,
      currency: "eur",
      // Carte bancaire (CB, Visa, Mastercard) ; Apple Pay et Google Pay passent par la carte.
      payment_method_types: ["card"],
      receipt_email: row.cliente_email,
      description: `Acompte ${POURCENT_ACOMPTE} % — ${nom} — ${quand} — ${business.name}`,
      metadata: { reservationId: row.id },
    },
    { idempotencyKey: `acompte-${row.id}-${centimes}-${row.stripe_payment_intent ?? "1"}` },
  );
  const { error } = await admin
    .from("reservations")
    .update({ stripe_payment_intent: intent.id })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  if (!intent.client_secret) throw new Error("Paiement indisponible.");
  return { clientSecret: intent.client_secret, statut: intent.status };
}

type RowPaiement = {
  id: string;
  date_debut: string;
  cliente_email: string;
  acompte_montant: number | null;
  stripe_session_id: string | null;
  prestations_detail?: unknown;
  prestations: { nom: string } | null;
};

/** Crée la page de paiement Stripe de l'acompte et renvoie son adresse. */
export async function creerSessionPaiement(admin: Admin, row: RowPaiement, origine: string) {
  const stripe = getStripe();
  const centimes = Math.round(Number(row.acompte_montant ?? 0) * 100);
  if (centimes < 50) throw new Error("Montant d'acompte invalide.");

  // Une seule page de paiement valide à la fois pour un même rendez-vous.
  if (row.stripe_session_id) {
    await stripe.checkout.sessions.expire(row.stripe_session_id).catch(() => undefined);
  }

  const { finPaiement, finBlocage } = echeances();
  // Toutes les prestations du rendez-vous, ex. « Dépose semi-permanent + Semi-permanent ».
  const detail = Array.isArray(row.prestations_detail)
    ? (row.prestations_detail as { nom: string }[])
    : [];
  const nom = detail.length
    ? detail.map((l) => l.nom).join(" + ")
    : (row.prestations?.nom ?? "Prestation");
  const quand = `${parisLongDate(row.date_debut)} à ${parisTime(row.date_debut)}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    locale: "fr",
    customer_email: row.cliente_email,
    client_reference_id: row.id,
    expires_at: Math.floor(finPaiement.getTime() / 1000),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: centimes,
          product_data: {
            name: `Acompte ${POURCENT_ACOMPTE} % — ${nom}`,
            description: `Rendez-vous du ${quand} — ${business.name}`,
          },
        },
      },
    ],
    metadata: { reservationId: row.id },
    payment_intent_data: {
      metadata: { reservationId: row.id },
      description: `Acompte — ${nom} — ${quand}`,
    },
    success_url: `${origine}/paiement?reservation=${row.id}&retour=ok`,
    cancel_url: `${origine}/paiement?reservation=${row.id}&retour=annule`,
  });

  const { error } = await admin
    .from("reservations")
    .update({ stripe_session_id: session.id, acompte_expire_le: finBlocage.toISOString() })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  if (!session.url) throw new Error("Page de paiement indisponible.");
  return session.url;
}

/** Rembourse l'acompte payé d'un rendez-vous. Renvoie vrai si le remboursement est lancé. */
export async function rembourserAcompte(
  admin: Admin,
  row: { id: string; stripe_payment_intent: string | null },
) {
  if (!row.stripe_payment_intent) return false;
  try {
    await getStripe().refunds.create(
      { payment_intent: row.stripe_payment_intent, reason: "requested_by_customer" },
      { idempotencyKey: `remboursement-${row.id}` },
    );
  } catch (e) {
    console.error("[acompte] remboursement", getStripeErrorMessage(e));
    return false;
  }
  await admin.from("reservations").update({ acompte_statut: "rembourse" }).eq("id", row.id);
  return true;
}

type SessionStripe = {
  id: string;
  payment_status?: string;
  payment_intent?: string | { id: string } | null;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
};

/** Paiement terminé : acompte payé, rendez-vous à valider par Maria, e-mails. */
export async function enregistrerPaiement(admin: Admin, session: SessionStripe) {
  const id = session.metadata?.reservationId;
  if (!id || session.payment_status !== "paid") return;
  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  await enregistrerAcomptePaye(admin, {
    reservationId: id,
    paymentIntentId: pi,
    montant: session.amount_total != null ? session.amount_total / 100 : null,
    sessionId: session.id,
  });
}

/**
 * Acompte payé (paiement intégré au site, page Stripe ou webhook) :
 * rendez-vous « Acompte payé – à valider », e-mails à la cliente et à Maria.
 */
export async function enregistrerAcomptePaye(
  admin: Admin,
  p: {
    reservationId: string;
    paymentIntentId: string | null;
    montant: number | null;
    sessionId?: string | null;
  },
) {
  const id = p.reservationId;
  const { data: row } = await admin
    .from("reservations")
    .select(SELECT_AVEC_PRESTATION)
    .eq("id", id)
    .maybeSingle();
  if (!row) return;
  if (row.acompte_statut === "paye" || row.acompte_statut === "rembourse") return; // déjà traité

  const pi = p.paymentIntentId;
  const montant = p.montant ?? Number(row.acompte_montant ?? 0);
  const paiement = {
    acompte_statut: "paye",
    acompte_montant: montant,
    acompte_paye_le: new Date().toISOString(),
    acompte_expire_le: null,
    stripe_session_id: p.sessionId ?? row.stripe_session_id,
    stripe_payment_intent: pi,
  };
  const { emailAcomptePayeCliente, emailNouvelleDemandeGerante, emailAlerteGerante } =
    await import("./emails.server");

  // Rendez-vous annulé entre-temps par la gérante : on rembourse.
  const annuleParGerante = row.statut === "annulee" && row.acompte_statut !== "expire";
  let conflit = annuleParGerante;
  if (!annuleParGerante) {
    // Toujours « à valider » par Maria (paiement arrivé après le délai : on retente le créneau).
    const statut = row.statut === "annulee" ? "en_attente" : row.statut;
    // Mise à jour exclusive : si le webhook et le retour de la cliente arrivent
    // en même temps, un seul enregistre le paiement (et envoie les e-mails).
    const { data: faits, error } = await admin
      .from("reservations")
      .update({ ...paiement, statut })
      .eq("id", id)
      .eq("acompte_statut", row.acompte_statut)
      .select("id");
    if (error && error.code !== "23P01") throw new Error(error.message);
    // 23P01 : paiement arrivé après le délai et créneau repris par une autre cliente.
    conflit = error?.code === "23P01";
    if (!conflit && !faits?.length) return; // déjà enregistré par l'autre appel
  }

  if (conflit) {
    const { data: faits } = await admin
      .from("reservations")
      .update(paiement)
      .eq("id", id)
      .eq("acompte_statut", row.acompte_statut)
      .select("id");
    if (!faits?.length) return; // déjà traité par l'autre appel
    const rembourse = await rembourserAcompte(admin, { id, stripe_payment_intent: pi });
    await emailAlerteGerante(
      versEmail({ ...row, ...paiement } as never),
      rembourse
        ? "Un acompte a été payé pour un créneau qui n'était plus disponible. Il a été remboursé automatiquement : pensez à recontacter la cliente."
        : "Un acompte a été payé pour un créneau qui n'était plus disponible. Le remboursement automatique a échoué : remboursez-le depuis le tableau de bord Stripe.",
    );
    return;
  }

  const { data: maj } = await admin
    .from("reservations")
    .select(SELECT_AVEC_PRESTATION)
    .eq("id", id)
    .maybeSingle();
  const mail = versEmail((maj ?? row) as never);
  await Promise.allSettled([emailAcomptePayeCliente(mail), emailNouvelleDemandeGerante(mail)]);
}

/**
 * Vérifie directement auprès de Stripe si l'acompte d'une réservation
 * provisoire a été payé (retour de la cliente sur le site). Ne dépend pas du
 * webhook : le paiement est enregistré même si le webhook est mal réglé.
 */
export async function verifierPaiement(
  admin: Admin,
  row: {
    id: string;
    acompte_statut: string;
    stripe_session_id: string | null;
    stripe_payment_intent: string | null;
  },
) {
  if (row.acompte_statut !== "en_attente") return false;
  try {
    // Paiement intégré au site (PaymentIntent)
    if (row.stripe_payment_intent) {
      const intent = await getStripe().paymentIntents.retrieve(row.stripe_payment_intent);
      if (intent.status !== "succeeded" || intent.metadata?.reservationId !== row.id) return false;
      await enregistrerAcomptePaye(admin, {
        reservationId: row.id,
        paymentIntentId: intent.id,
        montant: intent.amount_received / 100,
      });
      return true;
    }
    // Ancienne page de paiement Stripe (Checkout)
    if (!row.stripe_session_id) return false;
    const session = await getStripe().checkout.sessions.retrieve(row.stripe_session_id);
    if (session.payment_status !== "paid") return false;
    await enregistrerPaiement(admin, session as never);
    return true;
  } catch (e) {
    console.error("[acompte] vérification du paiement", getStripeErrorMessage(e));
    return false;
  }
}

/** Ferme la page de paiement Stripe d'une réservation provisoire (refus, annulation). */
export async function fermerSessionPaiement(sessionId: string | null) {
  if (!sessionId) return;
  await getStripe()
    .checkout.sessions.expire(sessionId)
    .catch(() => undefined);
}

/** Webhook « paiement réussi » (paiement intégré au site). */
export async function enregistrerIntention(
  admin: Admin,
  intent: {
    id: string;
    status?: string;
    amount_received?: number;
    metadata?: Record<string, string> | null;
  },
) {
  const id = intent.metadata?.reservationId;
  if (!id || intent.status !== "succeeded") return;
  await enregistrerAcomptePaye(admin, {
    reservationId: id,
    paymentIntentId: intent.id,
    montant: intent.amount_received != null ? intent.amount_received / 100 : null,
  });
}

/** Webhook « page de paiement expirée » : le créneau est libéré. */
export async function enregistrerExpiration(admin: Admin, session: SessionStripe) {
  const id = session.metadata?.reservationId;
  if (!id) return;
  await admin
    .from("reservations")
    .update({ statut: "annulee", acompte_statut: "expire" })
    .eq("id", id)
    .eq("acompte_statut", "en_attente")
    .eq("stripe_session_id", session.id);
}

/** Webhook « remboursement » (fait en ligne ou depuis le tableau de bord Stripe). */
export async function enregistrerRemboursement(
  admin: Admin,
  charge: { payment_intent?: string | { id: string } | null; refunded?: boolean },
) {
  const pi =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi || !charge.refunded) return;
  await admin
    .from("reservations")
    .update({ acompte_statut: "rembourse" })
    .eq("stripe_payment_intent", pi)
    .eq("acompte_statut", "paye");
}
