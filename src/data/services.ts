// Catalogue Emerald Beauty — aligné sur la fiche Planity.
// Prix TTC indicatifs.

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
  category: "naturels" | "gel" | "gelx" | "nailart";
  options?: ServiceOption[];
};

export const services: Service[] = [
  // -------- Ongles naturels --------
  {
    id: "semi-permanent",
    name: "Semi-permanent",
    description: "Manucure soignée puis pose vernis semi-permanent longue tenue.",
    basePrice: 30,
    durationMinutes: 40,
    category: "naturels",
  },
  {
    id: "renforcement",
    name: "Renforcement",
    description: "Renforcement de l'ongle naturel au gel pour repousser sereinement.",
    basePrice: 40,
    durationMinutes: 60,
    category: "naturels",
  },
  {
    id: "remplissage-naturels",
    name: "Remplissage",
    description: "Entretien d'un renforcement. À prévoir toutes les 3 à 4 semaines.",
    basePrice: 35,
    durationMinutes: 90,
    category: "naturels",
  },
  {
    id: "depose-naturels",
    name: "Dépose",
    description: "Dépose minutieuse suivie d'un soin nourrissant.",
    basePrice: 10,
    durationMinutes: 30,
    category: "naturels",
  },
  {
    id: "manucure-homme",
    name: "Manucure homme",
    description: "Soin des cuticules, mise en forme et finition satinée.",
    basePrice: 25,
    durationMinutes: 30,
    category: "naturels",
  },

  // -------- Extension gel --------
  {
    id: "gel-pose-complete",
    name: "Pose complète gel",
    description: "Rallongement au chablon, mise en forme et couleur.",
    basePrice: 60,
    durationMinutes: 90,
    category: "gel",
  },
  {
    id: "gel-remplissage",
    name: "Remplissage gel",
    description: "Entretien d'une pose gel existante.",
    basePrice: 55,
    durationMinutes: 120,
    category: "gel",
  },
  {
    id: "gel-depose",
    name: "Dépose gel",
    description: "Dépose complète avec soin de finition.",
    basePrice: 25,
    durationMinutes: 30,
    category: "gel",
  },

  // -------- Gel-X --------
  {
    id: "gelx-pose",
    name: "Pose Gel-X",
    description: "Capsules pré-formées posées au gel, rendu ultra naturel.",
    basePrice: 50,
    durationMinutes: 60,
    category: "gelx",
  },
  {
    id: "gelx-depose-pose",
    name: "Dépose + pose Gel-X",
    description: "Retrait de l'ancienne pose puis nouvelle pose Gel-X.",
    basePrice: 55,
    durationMinutes: 90,
    category: "gelx",
  },
  {
    id: "gelx-depose",
    name: "Dépose Gel-X",
    description: "Dépose douce de vos capsules Gel-X.",
    basePrice: 20,
    durationMinutes: 30,
    category: "gelx",
  },

  // -------- Nail art (options à ajouter à une pose) --------
  {
    id: "french",
    name: "✨ French",
    description: "French classique ou double french fine.",
    basePrice: 10,
    durationMinutes: 20,
    category: "nailart",
  },
  {
    id: "nailart-1",
    name: "🌸 Nail Art niveau 1",
    description: "Décoration légère pour sublimer la pose sans surcharge.",
    basePrice: 15,
    durationMinutes: 20,
    category: "nailart",
  },
  {
    id: "nailart-2",
    name: "🍒 Nail Art niveau 2",
    description: "Design travaillé avec effets ou ajout de matière.",
    basePrice: 20,
    durationMinutes: 30,
    category: "nailart",
  },
  {
    id: "nailart-3",
    name: "🦋 Nail Art niveau 3",
    description: "Création artistique complète, plus de précision et de détail.",
    basePrice: 25,
    durationMinutes: 40,
    category: "nailart",
  },
  {
    id: "nailart-xl",
    name: "💚 Nail Art premium XL",
    description: "Chrome complet, paillettes, feuille d'or, bijoux, effets 3D. Sur devis.",
    basePrice: 40,
    durationMinutes: 60,
    category: "nailart",
  },
];

export const getService = (id: string) => services.find((s) => s.id === id);
