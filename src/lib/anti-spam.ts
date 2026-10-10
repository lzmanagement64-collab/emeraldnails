// ============================================================
// Anti-spam des formulaires publics (réservation, contact).
// 1. Champ piège invisible : un humain ne le voit pas, un robot le remplit.
// 2. Temps de remplissage : un robot envoie le formulaire en une fraction
//    de seconde. Mesuré côté navigateur (pas d'écart d'horloge possible).
// Les limites de volume sont appliquées côté serveur (anti-spam.server.ts).
// ============================================================
import { z } from "zod";

export const champsAntiSpam = {
  siteWeb: z.string().max(500).optional().default(""),
  dureeMs: z.number().int().min(0).max(864_000_000),
};

/** Durée minimale (ms) entre l'ouverture de la page et l'envoi du formulaire. */
export const DUREE_MIN_MS = 2500;
