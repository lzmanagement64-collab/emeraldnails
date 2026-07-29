// Avis réels — fiche Planity Emerald Beauty (Lons).
// Note globale 4,8/5 sur 10 avis clients vérifiés.

export type Testimonial = {
  id: string;
  firstName: string;
  rating: number;
  text: string;
  service: string;
  date: string; // ISO — utilisé pour le JSON-LD Review
};

export const reviewsSummary = {
  ratingValue: 4.8,
  reviewCount: 10,
  source: "Planity",
  breakdown: [
    { label: "Accueil", value: 4.9 },
    { label: "Propreté", value: 4.7 },
    { label: "Cadre & ambiance", value: 4.7 },
    { label: "Qualité de la prestation", value: 4.9 },
  ],
} as const;

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    firstName: "Cliente vérifiée",
    rating: 5,
    text: "La meilleure, bisous.",
    service: "Avis Planity",
    date: "2026-07-18",
  },
  {
    id: "t2",
    firstName: "Cliente vérifiée",
    rating: 5,
    text: "J'ai passé un très bon moment, mes ongles sont incroyables. Encore merci !",
    service: "Avis Planity",
    date: "2026-07-08",
  },
  {
    id: "t3",
    firstName: "Cliente vérifiée",
    rating: 5,
    text: "Professionnel incroyable, travail de très bonne qualité, très gentille et toujours à l'écoute.",
    service: "Avis Planity",
    date: "2026-06-06",
  },
  {
    id: "t4",
    firstName: "Cliente vérifiée",
    rating: 5,
    text: "La meilleure ❤️",
    service: "Avis Planity",
    date: "2026-05-01",
  },
  {
    id: "t5",
    firstName: "Cliente vérifiée",
    rating: 5,
    text: "Très bien, c'est un 10/10 sur tous les aspects !",
    service: "Avis Planity",
    date: "2026-03-16",
  },
];
