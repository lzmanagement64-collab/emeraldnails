// Zones de chalandise — pages locales SEO (agglomération paloise, 64).
// Chaque page = une ville, contenu unique pour éviter la duplication.

export type Area = {
  slug: string;
  city: string;
  postalCode: string;
  distance: string;
  travelTime: string;
  intro: string;
  paragraphs: string[];
  landmarks: string[];
  keyword: string;
};

export const areas: Area[] = [
  {
    slug: "pau",
    city: "Pau",
    postalCode: "64000",
    distance: "5 km",
    travelTime: "10 minutes",
    keyword: "prothésiste ongulaire Pau",
    intro:
      "Vous cherchez une prothésiste ongulaire près de Pau (64000) ? Emerald Beauty vous accueille à Lons, à une dizaine de minutes du centre-ville, pour vos poses gel, Gel X, semi-permanent et nail art.",
    paragraphs: [
      "Installée à Lons, aux portes de Pau, Emerald Beauty est facilement accessible depuis le centre-ville, Trespoey ou le quartier de l'université : comptez une dizaine de minutes en voiture, avec un stationnement gratuit devant l'établissement.",
      "Chaque rendez-vous commence par un échange sur vos envies — forme, longueur, couleur — puis la prestation est réalisée avec soin, dans le respect de l'ongle naturel.",
      "Semi-permanent, renforcement, extension gel, Gel X et nail art : les prestations et les tarifs sont affichés en ligne, et le rendez-vous se réserve en quelques minutes.",
    ],
    landmarks: ["Centre-ville de Pau", "Les Halles", "Trespoey", "Université de Pau"],
  },
  {
    slug: "lons",
    city: "Lons",
    postalCode: "64140",
    distance: "sur place",
    travelTime: "0 minute",
    keyword: "prothésiste ongulaire Lons",
    intro:
      "Emerald Beauty, prothésiste ongulaire à Lons (64140), propose semi-permanent, renforcement, extension gel, Gel X et nail art, sur rendez-vous.",
    paragraphs: [
      "Emerald Beauty se trouve impasse d'Ossau à Lons, à quelques minutes de la mairie et de la zone commerciale.",
      "Habitantes de Lons, vous êtes à deux pas : la réservation en ligne affiche les créneaux disponibles, et il suffit de quelques minutes pour choisir le vôtre.",
      "Hygiène : instruments stérilisés en autoclave, limes et embouts à usage unique ou désinfectés à chaque cliente, produits professionnels certifiés. La santé de l'ongle naturel passe avant tout.",
    ],
    landmarks: ["Mairie de Lons", "Zone commerciale de Lons", "Stade du Hameau", "Quartier Perlic"],
  },
  {
    slug: "billere",
    city: "Billère",
    postalCode: "64140",
    distance: "3 km",
    travelTime: "7 minutes",
    keyword: "prothésiste ongulaire Billère",
    intro:
      "Prothésiste ongulaire près de Billère (64140) : Emerald Beauty vous reçoit à Lons, à moins de dix minutes, pour vos poses gel, Gel X et vos nail arts personnalisés.",
    paragraphs: [
      "Billère et Lons sont voisines : depuis l'avenue du Général Leclerc ou le centre de Billère, comptez quelques minutes de trajet.",
      "Le rendez-vous se réserve en ligne : vous choisissez la prestation et le créneau, vous décrivez vos envies en commentaire, puis vous validez votre demande.",
      "Pour un nail art, vous pouvez venir avec une idée ou une photo d'inspiration : le design est adapté à la forme de vos ongles et à votre quotidien.",
    ],
    landmarks: ["Centre de Billère", "Parc Lacaze", "Avenue du Général Leclerc"],
  },
  {
    slug: "jurancon",
    city: "Jurançon",
    postalCode: "64110",
    distance: "6 km",
    travelTime: "12 minutes",
    keyword: "prothésiste ongulaire Jurançon",
    intro:
      "Onglerie proche de Jurançon (64110) : Emerald Beauty, prothésiste ongulaire à Lons, propose extension gel, Gel X, semi-permanent et nail art sur rendez-vous, à une douzaine de minutes du centre de Jurançon.",
    paragraphs: [
      "Depuis Jurançon, Emerald Beauty est accessible en une douzaine de minutes en voiture, avec un stationnement gratuit sur place, et le rendez-vous se réserve en ligne à tout moment.",
      "Semi-permanent nude ou pose complète avec un design travaillé : la démarche reste la même, avec un échange sur votre quotidien et le choix d'une forme et d'une longueur adaptées.",
      "Vous pouvez découvrir les dernières réalisations sur Instagram avant votre rendez-vous, puis décrire vos inspirations dans le formulaire de réservation.",
    ],
    landmarks: ["Centre de Jurançon", "Vignoble de Jurançon", "Quartier Haut-de-Jurançon"],
  },
];

export const getArea = (slug: string) => areas.find((a) => a.slug === slug);
