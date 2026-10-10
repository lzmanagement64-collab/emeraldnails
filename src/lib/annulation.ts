// ============================================================
// Règle d'annulation — source unique des textes affichés.
// La même règle est appliquée par la base (fonction annuler_reservation).
// ============================================================
import { business } from "@/config/business";

export const DELAI_ANNULATION_H = business.bookingRules.annulationGratuiteHeures;

export const ANNULATION_TEXTE = `L'annulation est gratuite jusqu'à ${DELAI_ANNULATION_H} h avant le rendez-vous, en ligne avec le lien reçu par e-mail : l'acompte est alors remboursé. À moins de ${DELAI_ANNULATION_H} h, merci de contacter ${business.name} par téléphone au ${business.phoneDisplay}.`;

/** Règle de l'acompte en cas d'annulation ou d'absence. */
export const REGLE_ACOMPTE_TEXTE = `Annulation plus de ${DELAI_ANNULATION_H} h avant le rendez-vous : l'acompte est remboursé. Annulation moins de ${DELAI_ANNULATION_H} h avant, ou absence : l'acompte est conservé.`;

export const ANNULATION_TROP_TARD = `Votre rendez-vous a lieu dans moins de ${DELAI_ANNULATION_H} h : il ne peut plus être annulé en ligne. Merci de contacter ${business.name} par téléphone au ${business.phoneDisplay}.`;
