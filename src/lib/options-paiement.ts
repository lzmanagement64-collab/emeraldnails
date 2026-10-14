// ============================================================
// Options de paiement et règles de remboursement — source unique,
// utilisée par le site (affichage) ET par le serveur (montants réellement
// encaissés ou remboursés). Le serveur recalcule toujours à partir du prix
// enregistré en base : rien ne vient du navigateur.
//
// Options : acompte (30 % du total) ou totalité. Les prestations « sur devis »
// ne comptent jamais dans le total : elles se règlent sur place après devis.
//
// Remboursements (de ce qui a été payé en ligne) :
// - refus par Maria, ou annulation plus de 72 h avant : tout est remboursé ;
// - annulation moins de 72 h avant, ou absence : Maria garde l'équivalent de
//   l'acompte (30 % du total), le reste éventuel est remboursé.
// ============================================================
import { business } from "@/config/business";
import { montantAcompte, POURCENT_ACOMPTE } from "./acompte";
import { formatEuros } from "./tz";

export const MODES_PAIEMENT = ["acompte", "total"] as const;
export type ModePaiement = (typeof MODES_PAIEMENT)[number];

const arrondi = (v: number) => Math.round(v * 100) / 100;

/** Le mode enregistré en base, sous une forme sûre. */
export const modeValide = (m: string | null | undefined): ModePaiement =>
  m === "total" ? "total" : "acompte";

/** Montant à payer en ligne selon l'option choisie. */
export function montantAPayer(prix: number, mode: ModePaiement) {
  return mode === "total" ? arrondi(Number(prix)) : montantAcompte(prix);
}

/** Reste à régler sur place (hors prestations sur devis). */
export const resteSurPlace = (prix: number, paye: number) =>
  Math.max(0, arrondi(Number(prix) - Number(paye)));

/** Montants des deux options, pour l'affichage des boutons. */
export function optionsPaiement(prix: number) {
  const acompte = montantAPayer(prix, "acompte");
  const total = montantAPayer(prix, "total");
  return {
    acompte: { maintenant: acompte, surPlace: resteSurPlace(prix, acompte) },
    total: { maintenant: total, surPlace: 0 },
    // Les deux options ne diffèrent que si le reste vaut au moins 50 centimes.
    choixPossible: total - acompte >= 0.5,
  };
}

/** Libellés des deux options (boutons de l'étape Paiement). */
export function libelleOption(prix: number, mode: ModePaiement) {
  const o = optionsPaiement(prix);
  return mode === "total"
    ? {
        titre: "Payer la totalité",
        detail: `${formatEuros(o.total.maintenant)} maintenant, rien à régler sur place`,
      }
    : {
        titre: `Payer l'acompte (${POURCENT_ACOMPTE} %)`,
        detail: `${formatEuros(o.acompte.maintenant)} maintenant, ${formatEuros(o.acompte.surPlace)} sur place`,
      };
}

/** « Acompte payé » ou « Payé intégralement ». */
export const nomOption = (mode: ModePaiement) =>
  mode === "total" ? "Payé intégralement" : "Acompte payé";

// ------------------------------------------------------------
// Remboursements
// ------------------------------------------------------------
export type CasRemboursement = "refus" | "annulation_plus_72h" | "annulation_moins_72h" | "absence";

/** Annulation par la cliente : plus ou moins de 72 h avant le rendez-vous ? */
export function casAnnulation(dateDebut: string | Date, maintenant = new Date()): CasRemboursement {
  const ecart = new Date(dateDebut).getTime() - maintenant.getTime();
  return ecart > business.bookingRules.annulationGratuiteHeures * 3600_000
    ? "annulation_plus_72h"
    : "annulation_moins_72h";
}

/**
 * Montant à rembourser maintenant.
 * `paye` : encaissé en ligne ; `dejaRembourse` : déjà rendu ;
 * `acompte` : 30 % du total, gardé en cas d'annulation tardive ou d'absence.
 */
export function montantARembourser(p: {
  paye: number;
  dejaRembourse: number;
  acompte: number;
  cas: CasRemboursement;
}) {
  const disponible = arrondi(Number(p.paye) - Number(p.dejaRembourse));
  if (disponible <= 0) return 0;
  if (p.cas === "refus" || p.cas === "annulation_plus_72h") return disponible;
  // Maria garde l'équivalent de l'acompte (jamais plus que ce qui a été payé).
  const garde = Math.min(Number(p.acompte), Number(p.paye));
  return Math.max(0, arrondi(Number(p.paye) - garde - Number(p.dejaRembourse)));
}

/** Montant gardé par Maria une fois le remboursement fait. */
export const montantConserve = (paye: number, rembourse: number) =>
  Math.max(0, arrondi(Number(paye) - Number(rembourse)));

// ------------------------------------------------------------
// Textes (CGV, FAQ, formulaire, e-mails)
// ------------------------------------------------------------
const H = business.bookingRules.annulationGratuiteHeures;

export const OPTIONS_TEXTE = `Au moment de la réservation, vous choisissez de payer en ligne soit un acompte de ${POURCENT_ACOMPTE} % du total (le reste se règle sur place), soit la totalité (rien à régler sur place).`;

export const DEVIS_TEXTE =
  "Une prestation sur devis n'est pas comptée dans le montant payé en ligne : elle se règle sur place, après devis avec Maria.";

export const REMBOURSEMENT_TEXTE = `Si Maria ne peut pas vous recevoir, ou si vous annulez plus de ${H} h avant le rendez-vous, tout ce que vous avez payé est remboursé. En cas d'annulation moins de ${H} h avant, ou d'absence, Maria garde l'équivalent de l'acompte (${POURCENT_ACOMPTE} % du total) ; si vous aviez tout payé, le reste vous est remboursé automatiquement.`;
