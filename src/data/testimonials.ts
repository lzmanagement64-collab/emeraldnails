// Témoignages d'exemple à remplacer par des avis réels.
export type Testimonial = {
  id: string;
  firstName: string;
  rating: number;
  text: string;
  service: string;
};

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    firstName: "Élodie",
    rating: 5,
    text: "Une attention aux détails incroyable. L'hygiène est irréprochable et le résultat toujours parfait.",
    service: "Pose complète gel",
  },
  {
    id: "t2",
    firstName: "Clémence",
    rating: 5,
    text: "Le travail sur les cuticules est d'une précision chirurgicale. Je ne vais plus ailleurs.",
    service: "Semi-permanent",
  },
  {
    id: "t3",
    firstName: "Marion",
    rating: 5,
    text: "Un vrai moment pour soi. Camille est à l'écoute et propose des idées qui me correspondent.",
    service: "Gainage",
  },
  {
    id: "t4",
    firstName: "Sarah",
    rating: 5,
    text: "Tenue impeccable trois semaines plus tard. Le studio est calme et lumineux.",
    service: "Remplissage",
  },
];
