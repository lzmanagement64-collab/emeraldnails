// Avis issus de la fiche Planity Emerald Beauty (Lons) — à garder identiques à Planity.
// Pas de note chiffrée affichée sur le site (non vérifiable par la visiteuse).

export type Testimonial = {
  id: string;
  firstName: string;
  rating: number;
  text: string;
  service: string;
  date: string; // ISO — utilisé pour le JSON-LD Review
};

export const reviewsSummary = {
  source: "Planity",
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
