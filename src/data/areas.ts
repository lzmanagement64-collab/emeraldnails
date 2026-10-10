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
      "Vous cherchez une prothésiste ongulaire à Pau (64000) ? Emerald Beauty accueille les Paloises à Lons, à dix minutes du centre-ville, pour des poses gel, Gel X et du nail art sur mesure.",
    paragraphs: [
      "Situé aux portes de Pau, le studio Emerald Beauty reçoit chaque semaine des clientes venues du centre-ville, du quartier du Hédas, de Trespoey ou encore des Halles. Le trajet depuis la place Clemenceau prend une dizaine de minutes en voiture, avec un stationnement gratuit devant le studio — un vrai confort comparé au centre de Pau.",
      "Maria travaille en rendez-vous individuel : une seule cliente à la fois, jamais de chaîne. Chaque prestation commence par un diagnostic de l'ongle naturel, se poursuit par une préparation minutieuse (pas de ponçage agressif) et se termine par une finition brillante longue tenue. C'est ce soin du détail qui vaut au studio une note de 4,8/5.",
      "Semi-permanent, renforcement, extension gel, Gel X, nail art niveaux 1 à 3 : le catalogue couvre aussi bien la manucure discrète pour le bureau que les designs travaillés pour un mariage ou un événement. Les tarifs sont affichés en ligne, sans surprise.",
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
      "Emerald Beauty est votre studio d'onglerie à Lons (64140). Pose gel, Gel X, semi-permanent et nail art réalisés par Maria, sur rendez-vous, dans un espace calme et confidentiel.",
    paragraphs: [
      "Le studio se trouve impasse d'Ossau à Lons, à quelques minutes de la mairie et du centre commercial. Le lieu a été pensé comme un cocon : lumière douce, musique discrète, un seul poste de travail. Vous n'y croiserez pas d'autre cliente pendant votre rendez-vous.",
      "Habitantes de Lons, vous êtes à deux pas du studio : idéal pour caler un rendez-vous sans courir. La réservation en ligne affiche les créneaux réellement disponibles, avec confirmation immédiate.",
      "Hygiène irréprochable : instruments stérilisés, limes et embouts à usage unique ou désinfectés à chaque cliente, produits professionnels certifiés. La santé de l'ongle naturel prime toujours sur l'effet immédiat.",
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
      "Billère et Lons sont voisines : depuis l'avenue du Général Leclerc ou le quartier de la Mairie, comptez sept minutes de trajet. Beaucoup de clientes billéroises profitent de cette proximité pour caler facilement leur rendez-vous.",
      "Le rendez-vous se réserve entièrement en ligne : vous choisissez la prestation, le créneau, vous décrivez vos envies en commentaire et vous validez. Aucun appel nécessaire, une confirmation vous est envoyée par e-mail.",
      "Le nail art est la spécialité de la maison : french colorées, effets marbrés, fleurs 3D, chromes et motifs animaliers. Vous venez avec une idée ou une photo, Maria l'adapte à la forme de vos ongles et à votre quotidien.",
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
      "Onglerie proche de Jurançon (64110) : Emerald Beauty, studio d'ongles à Lons, propose extension gel, Gel X, semi-permanent et nail art sur rendez-vous à douze minutes du centre de Jurançon.",
    paragraphs: [
      "Depuis Jurançon, le studio est accessible en une douzaine de minutes par le pont de la voie rapide. Les clientes jurançonnaises apprécient la simplicité du stationnement et la possibilité de réserver en ligne à tout moment.",
      "Que vous veniez pour un semi-permanent nude tenue longue durée ou pour une pose complète avec design travaillé, la démarche reste la même : écoute de votre mode de vie, choix d'une longueur et d'une forme réalistes, puis exécution soignée. Une pose qui tient trois semaines vaut mieux qu'une pose spectaculaire qui casse.",
      "Vous pouvez suivre les dernières réalisations sur Instagram avant votre rendez-vous, puis joindre directement vos inspirations au formulaire de réservation.",
    ],
    landmarks: ["Centre de Jurançon", "Vignoble de Jurançon", "Quartier Haut-de-Jurançon"],
  },
];

export const getArea = (slug: string) => areas.find((a) => a.slug === slug);
