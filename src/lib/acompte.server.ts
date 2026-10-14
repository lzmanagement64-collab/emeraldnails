// ============================================================
// Acompte en ligne (Stripe) — logique serveur (jamais envoyée au navigateur).
//
// Déroulé :
// 1. La cliente valide le formulaire : le rendez-vous est enregistré en
//    « réservation provisoire » (acompte_statut = en_attente) et le paiement
//    s'affiche dans la page. Elle choisit l'acompte (30 %, par défaut) ou la
//    totalité : le montant est recalculé ici, jamais d'après le navigateur.
//    Le créneau est bloqué 35 minutes.
// 2. Paiement reçu (webhook Stripe signé, ou vérification directe auprès de
//    Stripe au retour de la cliente) : acompte « payé », rendez-vous « à
//    valider » par Maria. E-mail « demande reçue, acompte payé » à la cliente,
//    alerte à Maria.
// 2 bis. Maria valide (e-mail de confirmation) ou refuse (tout ce qui a été
//    payé est remboursé, e-mail d'explication).
// 3. Pas de paiement à temps : le créneau est libéré automatiquement.
// 4. Annulation : règles dans options-paiement.ts (montantARembourser).
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { adresseSite } from "./adresse-site.server";
import type { Database } from "@/integrations/supabase/types";
import { business } from "@/config/business";
import { getStripe, getStripeErrorMessage } from "./stripe.server";
import { POURCENT_ACOMPTE } from "./acompte";
import { modeValide, montantAPayer } from "./options-paiement";
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
  prix_total: number | null;
  acompte_montant: number | null;
  mode_paiement: string | null;
  stripe_payment_intent: string | null;
  prestations_detail?: unknown;
  prestations: { nom: string } | null;
};

/** Montant (en centimes) à payer en ligne pour l'option enregistrée, recalculé ici. */
export function centimesAPayer(
  row: Pick<RowIntention, "prix_total" | "acompte_montant" | "mode_paiement">,
) {
  const mode = modeValide(row.mode_paiement);
  const euros =
    mode === "total"
      ? montantAPayer(Number(row.prix_total ?? 0), "total")
      : Number(row.acompte_montant ?? montantAPayer(Number(row.prix_total ?? 0), "acompte"));
  return Math.round(euros * 100);
}

/** Erreur affichée si la cliente change d'option pendant qu'un paiement aboutit. */
export const PAIEMENT_DEJA_EN_COURS =
  "Un paiement est déjà en cours pour ce rendez-vous : l'option ne peut plus être changée.";

/**
 * Paiement intégré au site (Payment Element / Apple Pay / Google Pay) :
 * renvoie la clé de paiement (client secret) de ce rendez-vous, au montant de
 * l'option choisie (acompte ou totalité). Le paiement en cours est réutilisé,
 * ou son montant mis à jour si la cliente a changé d'option.
 */
export async function intentionPaiement(admin: Admin, row: RowIntention) {
  const stripe = getStripe();
  const centimes = centimesAPayer(row);
  const mode = modeValide(row.mode_paiement);
  if (centimes < 50) throw new Error("Montant à payer invalide.");

  const detail = Array.isArray(row.prestations_detail)
    ? (row.prestations_detail as { nom: string }[])
    : [];
  const nom = detail.length
    ? detail.map((l) => l.nom).join(" + ")
    : (row.prestations?.nom ?? "Prestation");
  const quand = `${parisLongDate(row.date_debut)} à ${parisTime(row.date_debut)}`;
  const description = `${mode === "total" ? "Paiement intégral" : `Acompte ${POURCENT_ACOMPTE} %`} — ${nom} — ${quand} — ${business.name}`;

  if (row.stripe_payment_intent) {
    const actuel = await stripe.paymentIntents.retrieve(row.stripe_payment_intent);
    const automatique = !!actuel.automatic_payment_methods?.enabled;
    const modifiable = [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
    ].includes(actuel.status);
    const enCours = ["processing", "succeeded"].includes(actuel.status);
    if (actuel.client_secret && actuel.amount === centimes && (automatique || enCours)) {
      return { clientSecret: actuel.client_secret, statut: actuel.status };
    }
    // Paiement déjà en cours ou terminé à un autre montant : on ne touche à rien.
    if (enCours) throw new Error(PAIEMENT_DEJA_EN_COURS);
    // Changement d'option : même paiement, nouveau montant.
    if (automatique && modifiable && actuel.client_secret) {
      const maj = await stripe.paymentIntents.update(actuel.id, {
        amount: centimes,
        description,
        metadata: { reservationId: row.id, mode },
      });
      return { clientSecret: maj.client_secret ?? actuel.client_secret, statut: maj.status };
    }
    // Ancien paiement non utilisable (ex. créé « carte seule ») : il est fermé avant d'en créer un neuf.
    if (actuel.status !== "canceled") {
      await stripe.paymentIntents.cancel(actuel.id).catch(() => undefined);
    }
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: centimes,
      currency: "eur",
      // Moyens de paiement automatiques : ceux activés dans le tableau de bord
      // Stripe (carte bancaire CB / Visa / Mastercard, Apple Pay, Google Pay…).
      automatic_payment_methods: { enabled: true },
      receipt_email: row.cliente_email,
      description,
      metadata: { reservationId: row.id, mode },
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

type RowRemboursement = {
  id: string;
  stripe_payment_intent: string | null;
  acompte_montant: number | null;
  montant_paye: number | null;
  montant_rembourse?: number | null;
};

/** Montant encaissé en ligne (anciennes réservations : l'acompte). */
export const montantEncaisse = (row: Pick<RowRemboursement, "montant_paye" | "acompte_montant">) =>
  Number(row.montant_paye ?? row.acompte_montant ?? 0);

/**
 * Rembourse `montant` euros (par défaut : tout ce qui reste) sur le paiement
 * d'un rendez-vous. Renvoie le montant remboursé, ou null si Stripe a refusé.
 * `motif` rend l'opération unique : un double clic ne rembourse pas deux fois.
 */
export async function rembourser(
  admin: Admin,
  row: RowRemboursement,
  motif: string,
  montant?: number,
): Promise<number | null> {
  const paye = montantEncaisse(row);
  const deja = Number(row.montant_rembourse ?? 0);
  const aRendre = Math.round(Math.min(montant ?? paye - deja, paye - deja) * 100) / 100;
  if (aRendre < 0.01) return 0;
  if (!row.stripe_payment_intent) return null;
  const centimes = Math.round(aRendre * 100);
  try {
    await getStripe().refunds.create(
      {
        payment_intent: row.stripe_payment_intent,
        amount: centimes,
        reason: "requested_by_customer",
        metadata: { reservationId: row.id, motif },
      },
      { idempotencyKey: `remboursement-${row.id}-${motif}-${centimes}` },
    );
  } catch (e) {
    console.error("[acompte] remboursement", getStripeErrorMessage(e));
    return null;
  }
  const total = Math.round((deja + aRendre) * 100) / 100;
  await admin
    .from("reservations")
    .update({
      montant_paye: paye,
      montant_rembourse: total,
      acompte_statut: total >= paye - 0.005 ? "rembourse" : "rembourse_partiel",
    })
    .eq("id", row.id);
  return aRendre;
}

/** Rembourse tout ce qui a été payé. Renvoie vrai si le remboursement est lancé. */
export async function rembourserAcompte(admin: Admin, row: RowRemboursement, motif = "total") {
  return (await rembourser(admin, row, motif)) !== null;
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
  // Montant réellement encaissé (lu chez Stripe) : il fixe l'option payée.
  const montant = p.montant ?? centimesAPayer(row) / 100;
  const prix = Number(row.prix_total ?? 0);
  const paiement = {
    acompte_statut: "paye",
    montant_paye: montant,
    mode_paiement: prix > 0 && montant >= prix - 0.005 ? "total" : "acompte",
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
    const rembourse = await rembourserAcompte(admin, {
      id,
      stripe_payment_intent: pi,
      acompte_montant: row.acompte_montant,
      montant_paye: montant,
      montant_rembourse: 0,
    });
    await emailAlerteGerante(
      versEmail({ ...row, ...paiement } as never),
      rembourse
        ? "Un paiement a été fait pour un créneau qui n'était plus disponible. Il a été remboursé automatiquement : pensez à recontacter la cliente."
        : "Un paiement a été fait pour un créneau qui n'était plus disponible. Le remboursement automatique a échoué : remboursez-le depuis le tableau de bord Stripe.",
    );
    return;
  }

  const { data: maj } = await admin
    .from("reservations")
    .select(SELECT_AVEC_PRESTATION)
    .eq("id", id)
    .maybeSingle();
  const mail = versEmail((maj ?? row) as never);
  const { notifNouvelleReservation } = await import("./notifications.server");
  await Promise.allSettled([
    emailAcomptePayeCliente(mail),
    emailNouvelleDemandeGerante(mail),
    notifNouvelleReservation(admin, {
      dateDebut: row.date_debut,
      paiement: paiement.mode_paiement === "total" ? "total" : "acompte",
    }),
  ]);
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

/** Webhook « remboursement » (fait par le site ou depuis le tableau de bord Stripe). */
export async function enregistrerRemboursement(
  admin: Admin,
  charge: {
    payment_intent?: string | { id: string } | null;
    refunded?: boolean;
    amount_refunded?: number;
  },
) {
  const pi =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi || !charge.amount_refunded) return;
  // Montant cumulé chez Stripe : le même événement reçu deux fois ne change rien.
  const { data: rows } = await admin
    .from("reservations")
    .select("id, montant_paye, acompte_montant, montant_rembourse")
    .eq("stripe_payment_intent", pi)
    .in("acompte_statut", ["paye", "rembourse_partiel", "rembourse"]);
  for (const r of rows ?? []) {
    const paye = montantEncaisse(r);
    const rembourse = Math.min(paye, charge.amount_refunded / 100);
    if (rembourse <= Number(r.montant_rembourse ?? 0)) continue;
    await admin
      .from("reservations")
      .update({
        montant_paye: paye,
        montant_rembourse: rembourse,
        acompte_statut:
          charge.refunded || rembourse >= paye - 0.005 ? "rembourse" : "rembourse_partiel",
      })
      .eq("id", r.id);
  }
}
