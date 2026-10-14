// ============================================================
// Règle d'annulation — source unique des textes affichés.
// La même règle est appliquée par la base (fonction annuler_reservation).
// ============================================================
import { business } from "@/config/business";
import { POURCENT_ACOMPTE } from "./acompte";

export const DELAI_ANNULATION_H = business.bookingRules.annulationGratuiteHeures;

export const ANNULATION_TEXTE = `L'annulation est gratuite jusqu'à ${DELAI_ANNULATION_H} h avant le rendez-vous, en ligne avec le lien reçu par e-mail : tout ce que vous avez payé est alors remboursé. À moins de ${DELAI_ANNULATION_H} h, merci de contacter ${business.name} par téléphone au ${business.phoneDisplay}.`;

/** Règle de remboursement en cas de refus, d'annulation ou d'absence (voir options-paiement.ts). */
export const REGLE_ACOMPTE_TEXTE = `Refus par Maria, ou annulation plus de ${DELAI_ANNULATION_H} h avant le rendez-vous : tout ce que vous avez payé est remboursé. Annulation moins de ${DELAI_ANNULATION_H} h avant, ou absence : Maria garde l'équivalent de l'acompte (${POURCENT_ACOMPTE} % du total) ; si vous aviez tout payé, le reste vous est remboursé automatiquement.`;

export const ANNULATION_TROP_TARD = `Votre rendez-vous a lieu dans moins de ${DELAI_ANNULATION_H} h : il ne peut plus être annulé en ligne. Merci de contacter ${business.name} par téléphone au ${business.phoneDisplay}.`;
