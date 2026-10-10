// ============================================================
// Règle d'annulation — source unique des textes affichés.
// La même règle est appliquée par la base (fonction annuler_reservation).
// ============================================================
import { business } from "@/config/business";

export const DELAI_ANNULATION_H = business.bookingRules.annulationGratuiteHeures;

export const ANNULATION_TEXTE = `L'annulation est gratuite jusqu'à ${DELAI_ANNULATION_H} h avant le rendez-vous, en ligne avec le lien reçu par e-mail. À moins de ${DELAI_ANNULATION_H} h, merci de contacter ${business.name} par téléphone au ${business.phoneDisplay}.`;

export const ANNULATION_TROP_TARD = `Votre rendez-vous a lieu dans moins de ${DELAI_ANNULATION_H} h : il ne peut plus être annulé en ligne. Merci de contacter ${business.name} par téléphone au ${business.phoneDisplay}.`;
