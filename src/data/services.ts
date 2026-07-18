// Données modifiables. Prix TTC à titre indicatif.

export type ServiceOption = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
  category: "mains" | "pieds" | "retouche";
  options?: ServiceOption[];
};

export const services: Service[] = [
  {
    id: "pose-gel",
    name: "Pose complète gel",
    description:
      "Rallongement au chablon, mise en forme et couleur. Finesse et tenue longue durée.",
    basePrice: 65,
    durationMinutes: 105,
    category: "mains",
    options: [
      { id: "nail-art-simple", name: "Nail art minimaliste", price: 10, durationMinutes: 15 },
      { id: "nail-art-avance", name: "Nail art travaillé", price: 25, durationMinutes: 30 },
      { id: "french", name: "French manucure", price: 8, durationMinutes: 10 },
    ],
  },
  {
    id: "semi-permanent",
    name: "Semi-permanent",
    description:
      "Manucure russe soignée puis pose couleur. Tenue jusqu'à 3 semaines.",
    basePrice: 40,
    durationMinutes: 60,
    category: "mains",
    options: [
      { id: "nail-art-simple", name: "Nail art minimaliste", price: 10, durationMinutes: 15 },
      { id: "french", name: "French manucure", price: 8, durationMinutes: 10 },
    ],
  },
  {
    id: "gainage",
    name: "Gainage",
    description:
      "Renforcement de l'ongle naturel au gel translucide. Idéal pour repousser sereinement.",
    basePrice: 50,
    durationMinutes: 75,
    category: "mains",
  },
  {
    id: "remplissage",
    name: "Remplissage",
    description: "Entretien d'une pose existante. À prévoir toutes les 3 à 4 semaines.",
    basePrice: 45,
    durationMinutes: 75,
    category: "retouche",
    options: [
      { id: "changement-couleur", name: "Changement de couleur", price: 5, durationMinutes: 5 },
      { id: "nail-art-simple", name: "Nail art minimaliste", price: 10, durationMinutes: 15 },
    ],
  },
  {
    id: "depose",
    name: "Dépose seule",
    description: "Dépose minutieuse suivie d'un soin nourrissant.",
    basePrice: 20,
    durationMinutes: 30,
    category: "retouche",
  },
  {
    id: "reparation",
    name: "Réparation d'un ongle",
    description: "Reconstruction d'un ongle cassé entre deux rendez-vous.",
    basePrice: 8,
    durationMinutes: 15,
    category: "retouche",
  },
  {
    id: "beaute-pieds",
    name: "Beauté des pieds",
    description: "Soin des cuticules, ponçage et pose semi-permanent.",
    basePrice: 55,
    durationMinutes: 75,
    category: "pieds",
  },
];

export const getService = (id: string) => services.find((s) => s.id === id);
