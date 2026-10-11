// ============================================================
// Photos de réalisations d'Emerald Beauty (fichiers WebP dans
// public/photos/realisations, en 3 tailles : 480, 960 et 1600 px).
// La galerie du site est gérée dans l'admin (table galerie_photos) ;
// cette liste ne sert que si la base de données ne répond pas.
// ============================================================
import type { PhotoGalerie } from "@/lib/galerie";
import { photoStatique } from "@/lib/galerie";

type Realisation = {
  titre: string;
  categorie: string;
  base: string;
  accueil: boolean;
  banniere: boolean;
  alt: string;
};

export const realisations: Realisation[] = [
  {
    titre: "Blanc laiteux · amande",
    categorie: "french",
    base: "/photos/realisations/banniere-french-blanc-laiteux",
    accueil: false,
    banniere: true,
    alt: "Ongles amande blanc laiteux brillant, pose réalisée par Emerald Beauty, prothésiste ongulaire à Lons",
  },
  {
    titre: "French blanche · fleurs bleues",
    categorie: "french",
    base: "/photos/realisations/accueil-1-french-fleurs-bleues",
    accueil: true,
    banniere: false,
    alt: "Ongles amande en french blanche avec fleurs bleues peintes à la main, réalisation Emerald Beauty à Lons près de Pau",
  },
  {
    titre: "Nude & rose · fleurs 3D et bijoux",
    categorie: "nail-art",
    base: "/photos/realisations/accueil-2-nailart-rose-3d-bijoux",
    accueil: true,
    banniere: false,
    alt: "Nail art sur ongles amande nude : pointes roses, fleurs 3D roses et bijoux dorés, par Emerald Beauty à Lons",
  },
  {
    titre: "Fleurs 3D blanc crème · touches dorées",
    categorie: "nail-art",
    base: "/photos/realisations/accueil-3-nailart-fleurs-3d-blanc-creme-or",
    accueil: true,
    banniere: false,
    alt: "Ongles longs amande nude ornés de fleurs 3D blanc crème et de détails dorés, réalisés par Emerald Beauty, prothésiste ongulaire à Lons",
  },
  {
    titre: "Corail · fleurs 3D",
    categorie: "nail-art",
    base: "/photos/realisations/accueil-4-nailart-corail-fleurs-3d",
    accueil: true,
    banniere: false,
    alt: "Ongles amande corail et orange avec fleurs 3D et détails dorés, nail art Emerald Beauty à Lons",
  },
  {
    titre: "French blanche · carré",
    categorie: "french",
    base: "/photos/realisations/galerie-french-carree-blanche",
    accueil: false,
    banniere: false,
    alt: "French manucure blanche sur ongles longs forme carrée, réalisée par Emerald Beauty à Lons",
  },
  {
    titre: "French rose · paillettes argentées",
    categorie: "french",
    base: "/photos/realisations/galerie-french-paillettes-rose-argent",
    accueil: false,
    banniere: false,
    alt: "Ongles carrés rose nude avec french à paillettes argentées, Emerald Beauty, prothésiste ongulaire à Lons",
  },
  {
    titre: "French rose classique",
    categorie: "french",
    base: "/photos/realisations/galerie-french-rose-classique",
    accueil: false,
    banniere: false,
    alt: "French classique blanche sur base rose, ongles amande, réalisation Emerald Beauty à Lons",
  },
  {
    titre: "Fleurs bleues · carré",
    categorie: "nail-art",
    base: "/photos/realisations/galerie-nailart-fleurs-bleues-carre",
    accueil: false,
    banniere: false,
    alt: "Ongles longs carrés en french blanche décorés de fleurs bleues peintes à la main, nail art Emerald Beauty",
  },
  {
    titre: "Nude · fleur 3D",
    categorie: "nail-art",
    base: "/photos/realisations/galerie-nailart-french-nude-fleur-3d",
    accueil: false,
    banniere: false,
    alt: "Ongles amande nude avec une fleur 3D délicate, réalisation Emerald Beauty, prothésiste ongulaire à Lons",
  },
  {
    titre: "Écaille de tortue",
    categorie: "nail-art",
    base: "/photos/realisations/galerie-nailart-ecaille-tortue",
    accueil: false,
    banniere: false,
    alt: "Ongles amande nude avec pointes effet écaille de tortue, nail art Emerald Beauty à Lons",
  },
  {
    titre: "Dégradé orange & jaune · fleur rose",
    categorie: "nail-art",
    base: "/photos/realisations/galerie-nailart-orange-jaune-fleur-rose",
    accueil: false,
    banniere: false,
    alt: "Ongles amande en dégradé orange et jaune avec une fleur rose, nail art Emerald Beauty à Lons",
  },
  {
    titre: "Stiletto rouge & jaune · strass",
    categorie: "nail-art",
    base: "/photos/realisations/galerie-nailart-stiletto-rouge-jaune-strass",
    accueil: false,
    banniere: false,
    alt: "Ongles stiletto longs rouges et jaunes avec motifs, strass et chaînes dorées, nail art Emerald Beauty",
  },
  {
    titre: "Stiletto violet & jaune · motifs",
    categorie: "nail-art",
    base: "/photos/realisations/galerie-nailart-stiletto-violet-jaune",
    accueil: false,
    banniere: false,
    alt: "Ongles stiletto longs violets et jaunes avec pois et motifs zèbre, nail art Emerald Beauty à Lons",
  },
  {
    titre: "Zèbre bleu & jaune",
    categorie: "nail-art",
    base: "/photos/realisations/galerie-nailart-stiletto-zebre-bleu-jaune",
    accueil: false,
    banniere: false,
    alt: "Ongles amande nude avec pointes zèbre blanc, bleu ciel et jaune, nail art Emerald Beauty à Lons",
  },
  {
    titre: "Rouge cerise",
    categorie: "couleur",
    base: "/photos/realisations/galerie-couleur-rouge-cerise",
    accueil: false,
    banniere: false,
    alt: "Ongles amande rouge cerise brillant, couleur unie réalisée par Emerald Beauty, prothésiste ongulaire à Lons",
  },
];

/** Photo de la page Savoir-faire. */
export const PHOTO_SAVOIR_FAIRE = {
  base: "/photos/realisations/savoir-faire-fleur-rose-3d-gant",
  alt: "Ongle carré blanc laiteux orné d'une fleur rose 3D, tenu par la main gantée de la prothésiste ongulaire Emerald Beauty à Lons",
};

/** Photos de secours, au format de la galerie gérée dans l'admin. */
export const photosParDefaut: PhotoGalerie[] = realisations.map((r, i) =>
  photoStatique({
    id: `defaut-${i}`,
    titre: r.titre,
    categorie: r.categorie,
    base: r.base,
    accueil: r.accueil,
    banniere: r.banniere,
    alt: r.alt,
    ordre: i,
  }),
);
