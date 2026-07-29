// ============================================================
// Configuration centrale — Emerald Beauty (Lons, 64140)
// Direction artistique inspirée du logo : vert émeraude profond,
// crème/ivoire et touche dorée.
// ============================================================

export const business = {
  name: "Emerald Beauty",
  tagline: "L'art de sublimer chaque instant.",
  shortDescription:
    "Studio d'ongles à Lons — extension gel, Gel X et nail art signés Maria.",
  founder: "Maria",
  city: "Lons",
  address: "7 Imp. d'Ossau, 64140 Lons",
  phone: "+33 6 00 00 00 00",
  phoneDisplay: "06 00 00 00 00",
  email: "contact@emerald-beauty.fr",
  instagram: "@emerald.beauty64",
  instagramUrl: "https://instagram.com/emerald.beauty64",
  googleBusinessUrl: "https://www.google.com/maps/search/?api=1&query=7+Imp.+d%27Ossau+64140+Lons",
  hours: [
    { day: "Lundi", value: "Fermé" },
    { day: "Mardi", value: "10h – 22h" },
    { day: "Mercredi", value: "10h – 22h" },
    { day: "Jeudi", value: "10h – 22h" },
    { day: "Vendredi", value: "10h – 17h15" },
    { day: "Samedi", value: "10h – 22h" },
    { day: "Dimanche", value: "Fermé" },
  ],
  weekdayHours: {
    0: null,
    1: null,
    2: { start: "10:00", end: "22:00" },
    3: { start: "10:00", end: "22:00" },
    4: { start: "10:00", end: "22:00" },
    5: { start: "10:00", end: "17:15" },
    6: { start: "10:00", end: "22:00" },
  } as Record<number, { start: string; end: string } | null>,
  bookingRules: {
    minLeadHours: 24,
    maxAdvanceDays: 60,
    slotStepMinutes: 30,
    bufferMinutes: 15,
    depositRate: 0.2,
  },
} as const;

export type Business = typeof business;
