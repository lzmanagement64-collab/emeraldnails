// ============================================================
// Configuration centrale de l'entreprise.
// Modifie ce fichier pour personnaliser l'ensemble du site.
// ============================================================

export const business = {
  name: "Atelier Porcelaine",
  tagline: "L'art de l'ongle, en pleine lumière.",
  shortDescription:
    "Studio confidentiel dédié au soin et à la beauté naturelle de l'ongle.",
  founder: "Camille",
  city: "Paris",
  address: "12 rue de la Paix, 75002 Paris",
  phone: "+33 6 12 34 56 78",
  phoneDisplay: "06 12 34 56 78",
  email: "bonjour@atelier-porcelaine.fr",
  instagram: "@atelier.porcelaine",
  instagramUrl: "https://instagram.com/",
  googleBusinessUrl: "https://www.google.com/maps",
  hours: [
    { day: "Lundi", value: "Fermé" },
    { day: "Mardi", value: "10h – 19h" },
    { day: "Mercredi", value: "10h – 19h" },
    { day: "Jeudi", value: "10h – 20h" },
    { day: "Vendredi", value: "10h – 20h" },
    { day: "Samedi", value: "9h30 – 18h" },
    { day: "Dimanche", value: "Fermé" },
  ],
  // Planning
  weekdayHours: {
    // 0 = dimanche ... 6 = samedi
    0: null,
    1: null,
    2: { start: "10:00", end: "19:00" },
    3: { start: "10:00", end: "19:00" },
    4: { start: "10:00", end: "20:00" },
    5: { start: "10:00", end: "20:00" },
    6: { start: "09:30", end: "18:00" },
  } as Record<number, { start: string; end: string } | null>,
  bookingRules: {
    minLeadHours: 24, // délai minimum avant réservation
    maxAdvanceDays: 60, // horizon max
    slotStepMinutes: 30, // pas de créneau
    bufferMinutes: 15, // pause entre 2 clientes
  },
} as const;

export type Business = typeof business;
