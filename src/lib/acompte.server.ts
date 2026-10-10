// ============================================================
// Acompte en ligne (Stripe) — logique serveur (jamais envoyée au navigateur).
//
// Déroulé :
// 1. La cliente valide le formulaire : le rendez-vous est enregistré en
//    « réservation provisoire » (acompte_statut = en_attente) et la page de
//    paiement Stripe s'ouvre. Le créneau est bloqué 35 minutes.
// 2. Paiement reçu (webhook Stripe signé) : acompte « payé », rendez-vous
//    confirmé, e-mails envoyés.
// 3. Pas de paiement à temps : le créneau est libéré automatiquement.
// 4. Annulation en ligne (plus de 72 h avant) : acompte remboursé.
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
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
export function origineSite() {
  try {
    const url = new URL(getRequest().url);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return `${local ? url.protocol : "https:"}//${url.host}`;
  } catch {
    return (process.env["SITE_URL"] || business.siteUrl).replace(/\/$/, "");
  }
}

/** Fin de blocage d'une nouvelle réservation provisoire (enregistrée avant le paiement). */
export const finBlocageProvisoire = () => echeances().finBlocage;

/** Passe en « annulée » les réservations provisoires non payées dans le délai. */
export async function libererReservationsExpirees(admin: Admin) {
  const { error } = await admin
    .from("reservations")
    .update({ statut: "annulee", acompte_statut: "expire" })
    .eq("acompte_statut", "en_attente")
    .lt("acompte_expire_le", new Date().toISOString());
  if (error) console.error("[acompte] libération des créneaux expirés", error.message);
}

type RowPaiement = {
  id: string;
  date_debut: string;
  cliente_email: string;
  acompte_montant: number | null;
  stripe_session_id: string | null;
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
  const nom = row.prestations?.nom ?? "Prestation";
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

/** Webhook « paiement terminé » : acompte payé, rendez-vous confirmé, e-mails. */
export async function enregistrerPaiement(admin: Admin, session: SessionStripe) {
  const id = session.metadata?.reservationId;
  if (!id || session.payment_status !== "paid") return;
  const { data: row } = await admin
    .from("reservations")
    .select(SELECT_AVEC_PRESTATION)
    .eq("id", id)
    .maybeSingle();
  if (!row) return;
  if (row.acompte_statut === "paye" || row.acompte_statut === "rembourse") return; // déjà traité

  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const montant =
    session.amount_total != null ? session.amount_total / 100 : Number(row.acompte_montant ?? 0);
  const paiement = {
    acompte_statut: "paye",
    acompte_montant: montant,
    acompte_paye_le: new Date().toISOString(),
    acompte_expire_le: null,
    stripe_session_id: session.id,
    stripe_payment_intent: pi,
  };
  const { emailConfirmationCliente, emailNouvelleDemandeGerante, emailAlerteGerante } =
    await import("./emails.server");

  // Rendez-vous annulé entre-temps par la gérante : on rembourse.
  const annuleParGerante = row.statut === "annulee" && row.acompte_statut !== "expire";
  let conflit = annuleParGerante;
  if (!annuleParGerante) {
    const statut =
      row.statut === "en_attente" || row.statut === "annulee" ? "confirmee" : row.statut;
    const { error } = await admin
      .from("reservations")
      .update({ ...paiement, statut })
      .eq("id", id);
    if (error && error.code !== "23P01") throw new Error(error.message);
    // 23P01 : paiement arrivé après le délai et créneau repris par une autre cliente.
    conflit = error?.code === "23P01";
  }

  if (conflit) {
    await admin.from("reservations").update(paiement).eq("id", id);
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
  await Promise.allSettled([emailConfirmationCliente(mail), emailNouvelleDemandeGerante(mail)]);
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
