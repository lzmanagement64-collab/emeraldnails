// ============================================================
// Acompte demandé pour valider un rendez-vous — source unique.
// Le taux se règle dans src/config/business.ts (bookingRules.depositRate).
// L'acompte est payé en ligne (Stripe) à l'étape « Paiement » de la réservation.
// ============================================================
import { business } from "@/config/business";
import { formatEuros } from "./tz";

export const TAUX_ACOMPTE = business.bookingRules.depositRate;
export const POURCENT_ACOMPTE = Math.round(TAUX_ACOMPTE * 100);

/** Montant de l'acompte, arrondi au centime. */
export const montantAcompte = (prix: number) => Math.round(Number(prix) * TAUX_ACOMPTE * 100) / 100;

/** « 16,50 € » pour une prestation à 55 €. */
export const acompteFormate = (prix: number) => formatEuros(montantAcompte(prix));

export const ACOMPTE_TEXTE = `Au moment de la réservation, vous payez en ligne un acompte de ${POURCENT_ACOMPTE} % du total, ou la totalité si vous préférez : cela bloque votre créneau, puis Maria valide votre rendez-vous (sinon, tout ce que vous avez payé est remboursé).`;
