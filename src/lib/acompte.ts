// ============================================================
// Acompte demandé pour valider un rendez-vous — source unique.
// Le taux se règle dans src/config/business.ts (bookingRules.depositRate).
// Le paiement en ligne n'est pas activé : le site informe seulement.
// ============================================================
import { business } from "@/config/business";
import { formatEuros } from "./tz";

export const TAUX_ACOMPTE = business.bookingRules.depositRate;
export const POURCENT_ACOMPTE = Math.round(TAUX_ACOMPTE * 100);

/** Montant de l'acompte, arrondi au centime. */
export const montantAcompte = (prix: number) => Math.round(Number(prix) * TAUX_ACOMPTE * 100) / 100;

/** « 16,50 € » pour une prestation à 55 €. */
export const acompteFormate = (prix: number) => formatEuros(montantAcompte(prix));

export const ACOMPTE_TEXTE = `Un acompte de ${POURCENT_ACOMPTE} % du montant de la prestation, réglé en ligne au moment de la réservation, valide le rendez-vous.`;
