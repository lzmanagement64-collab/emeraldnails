// ============================================================
// Configuration centrale — Emerald Beauty (Lons, 64140)
// Direction artistique inspirée du logo : vert émeraude profond,
// crème/ivoire et touche dorée.
// ============================================================

export const SITE_URL = "https://velvet-digits-booker.lovable.app";

export const business = {
  siteUrl: SITE_URL,
  name: "Emerald Beauty",
  tagline: "L'art de sublimer chaque instant.",
  shortDescription:
    "Prothésiste ongulaire à Lons — semi-permanent, renforcement, extension gel, Gel X et nail art.",
  founder: "Maria",
  city: "Lons",
  address: "7 Imp. d'Ossau, 64140 Lons",
  phone: "+33617255424",
  phoneDisplay: "06 17 25 54 24",
  // Adresse de contact publique (site, reply-to des e-mails clientes).
  email: "emeraldnails@outlook.fr",
  // Adresse privée de la gérante : notifications back-office uniquement.
  // Ne jamais l'afficher sur une page publique ni dans un e-mail cliente.
  ownerEmail: "emeraldnails@outlook.fr",
  // Liste blanche des comptes autorisés à accéder à l'administration.
  // La vérification réelle est faite côté serveur (voir admin-guard.server.ts).
  adminEmails: ["mariachtioui@outlook.fr"],
  instagram: "@emerald.beauty64",
  instagramUrl: "https://instagram.com/emerald.beauty64",
  googleBusinessUrl: "https://www.google.com/maps/search/?api=1&query=7+Imp.+d%27Ossau+64140+Lons",
  // Horaires d'ouverture : gérés en base (onglet « Horaires » de /admin),
  // voir src/lib/site-data.ts.
  bookingRules: {
    minLeadHours: 24,
    maxAdvanceDays: 60,
    slotStepMinutes: 30,
    bufferMinutes: 15,
    depositRate: 0.3,
    /** Annulation gratuite (et possible en ligne) jusqu'à ce délai avant le rendez-vous. */
    annulationGratuiteHeures: 72,
  },
  serviceArea: ["Pau", "Lons", "Billère", "Jurançon", "Lescar", "Bizanos", "Idron", "Gan"],
} as const;

export type Business = typeof business;
