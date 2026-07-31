import { z } from "zod";

const txt = (max: number) => z.string().trim().max(max);

/** Numéro français : 06 12 34 56 78, +33 6 12 34 56 78, 0612345678… */
export const telephoneFR = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ""))
  .refine((v) => /^(?:\+33|0033|0)[1-9]\d{8}$/.test(v), {
    message: "Numéro de téléphone français invalide (ex. 06 12 34 56 78)",
  });

export const reservationPubliqueSchema = z.object({
  prestationId: z.string().uuid("Prestation invalide"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  heure: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
  prenom: txt(60).min(1, "Le prénom est obligatoire"),
  nom: txt(60).min(1, "Le nom est obligatoire"),
  telephone: telephoneFR,
  email: txt(255).email("Adresse email invalide"),
  commentaire: txt(1000).optional().default(""),
  consentement: z.literal(true, {
    message: "Vous devez accepter la politique de confidentialité",
  }),
});
export type ReservationPubliqueInput = z.infer<typeof reservationPubliqueSchema>;

export const creneauxSchema = z.object({
  prestationId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const moisSchema = z.object({
  prestationId: z.string().uuid(),
  mois: z.string().regex(/^\d{4}-\d{2}$/),
});

export const STATUTS = ["en_attente", "confirmee", "annulee", "honoree", "absente"] as const;
export type Statut = (typeof STATUTS)[number];

export const statutSchema = z.object({
  id: z.string().uuid(),
  statut: z.enum(STATUTS),
});

export const reservationManuelleSchema = z.object({
  prestationId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heure: z.string().regex(/^\d{2}:\d{2}$/),
  prenom: txt(60).min(1),
  nom: txt(60).min(1),
  telephone: telephoneFR,
  email: txt(255).email().or(z.literal("")),
  commentaire: txt(1000).optional().default(""),
  statut: z.enum(STATUTS).default("confirmee"),
});

export const prestationSchema = z.object({
  id: z.string().uuid().optional(),
  nom: txt(120).min(1, "Le nom est obligatoire"),
  description: txt(600).optional().default(""),
  dureeMinutes: z.number().int().min(5).max(600),
  prix: z.number().min(0).max(2000),
  couleur: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale attendue")
    .default("#1f6b43"),
  actif: z.boolean().default(true),
  ordre: z.number().int().min(0).max(999).default(0),
});

export const horaireSchema = z.object({
  jourSemaine: z.number().int().min(0).max(6),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/),
  pauseDebut: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).optional(),
  pauseFin: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal("")).optional(),
  ferme: z.boolean(),
});

export const indisponibiliteSchema = z.object({
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/).default("00:00"),
  dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/).default("23:59"),
  motif: txt(200).optional().default(""),
});

export const idSchema = z.object({ id: z.string().uuid() });
export const tokenSchema = z.object({ token: z.string().uuid("Lien d'annulation invalide") });

export const REGLES = {
  delaiMinHeures: 12,
  maxJoursAvance: 60,
  relanceSemaines: 8,
} as const;

export const STATUT_LABEL: Record<Statut, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  annulee: "Annulée",
  honoree: "Honorée",
  absente: "Absente",
};
