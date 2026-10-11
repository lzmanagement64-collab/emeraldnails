// ============================================================
// Galerie : catégories et format des photos (site + admin).
// Les photos sont gérées par la gérante dans l'admin (table galerie_photos,
// fichiers dans le stockage « galerie », ou photos livrées avec le site
// dans public/photos). Si la base est injoignable, le site affiche les
// photos de src/data/gallery.ts.
// ============================================================
import { z } from "zod";

export const CATEGORIES_GALERIE = [
  { id: "nude", label: "Nude" },
  { id: "french", label: "French" },
  { id: "nail-art", label: "Nail art" },
  { id: "couleur", label: "Couleur" },
  { id: "long", label: "Ongles longs" },
  { id: "court", label: "Ongles courts" },
] as const;

export type CategorieGalerie = (typeof CATEGORIES_GALERIE)[number]["id"];
export const libelleCategorie = (id: string) =>
  CATEGORIES_GALERIE.find((c) => c.id === id)?.label ?? id;

export type PhotoGalerie = {
  id: string;
  titre: string;
  categorie: string;
  /** Grande taille (plein écran). */
  src: string;
  /** Petite taille (vignettes, mobile). */
  vignette: string;
  /** Toutes les tailles disponibles (attribut srcset). */
  srcset: string;
  /** Texte alternatif (référencement, lecteurs d'écran). */
  alt: string;
  /** Texte alternatif saisi dans l'admin (vide = automatique). */
  texteAlt: string;
  accueil: boolean;
  /** Photo de la bannière d'accueil. */
  banniere: boolean;
  visible: boolean;
  ordre: number;
};

/** Largeurs des deux versions enregistrées pour chaque photo ajoutée depuis l'admin. */
export const TAILLES_PHOTO = { grand: 1600, petit: 720 } as const;

const categorie = z.enum(
  CATEGORIES_GALERIE.map((c) => c.id) as [CategorieGalerie, ...CategorieGalerie[]],
);

export const photoAjoutSchema = z.object({
  // Dossier tiré au hasard par le navigateur (identifiant unique).
  chemin: z.string().uuid(),
  titre: z.string().trim().max(120).default(""),
  categorie,
});

export const photoModifSchema = z.object({
  id: z.string().uuid(),
  titre: z.string().trim().max(120).optional(),
  categorie: categorie.optional(),
  visible: z.boolean().optional(),
  accueil: z.boolean().optional(),
  banniere: z.literal(true).optional(),
  texte_alt: z.string().trim().max(250).optional(),
});

export const ordreGalerieSchema = z.object({ ids: z.array(z.string().uuid()).max(500) });

type LigneGalerie = {
  id: string;
  titre: string;
  categorie: string;
  chemin: string | null;
  url_statique: string | null;
  accueil: boolean;
  visible: boolean;
  ordre: number;
  banniere?: boolean;
  texte_alt?: string;
};

/** Texte alternatif automatique quand aucun n'a été saisi. */
const altAuto = (titre: string, categorie: string) =>
  `${titre || `Réalisation ${libelleCategorie(categorie).toLowerCase()}`} — Emerald Beauty, prothésiste ongulaire à Lons`;

/**
 * Photo livrée avec le site (public/photos/…) : `base` sans extension,
 * fichiers `base-480.webp`, `base-960.webp` et `base-1600.webp`.
 */
export function photoStatique(p: {
  id: string;
  titre: string;
  categorie: string;
  base: string;
  accueil: boolean;
  banniere: boolean;
  alt: string;
  ordre: number;
  visible?: boolean;
}): PhotoGalerie {
  return {
    id: p.id,
    titre: p.titre,
    categorie: p.categorie,
    src: `${p.base}-1600.webp`,
    vignette: `${p.base}-960.webp`,
    srcset: `${p.base}-480.webp 480w, ${p.base}-960.webp 960w, ${p.base}-1600.webp 1600w`,
    alt: p.alt || altAuto(p.titre, p.categorie),
    texteAlt: p.alt,
    accueil: p.accueil,
    banniere: p.banniere,
    visible: p.visible ?? true,
    ordre: p.ordre,
  };
}

/** Adresses publiques des tailles d'une photo (admin : stockage ; site : public/photos). */
export function versPhoto(row: LigneGalerie, supabaseUrl: string): PhotoGalerie {
  const texteAlt = row.texte_alt ?? "";
  if (!row.chemin && row.url_statique && !/\.[a-z0-9]+$/i.test(row.url_statique)) {
    return photoStatique({
      id: row.id,
      titre: row.titre,
      categorie: row.categorie,
      base: row.url_statique,
      accueil: row.accueil,
      banniere: !!row.banniere,
      alt: texteAlt,
      ordre: row.ordre,
      visible: row.visible,
    });
  }
  const base = row.chemin
    ? `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/galerie/${row.chemin}`
    : null;
  const src = base ? `${base}/grand.webp` : (row.url_statique ?? "");
  const vignette = base ? `${base}/petit.webp` : (row.url_statique ?? "");
  return {
    id: row.id,
    titre: row.titre,
    categorie: row.categorie,
    src,
    vignette,
    srcset: base ? `${vignette} ${TAILLES_PHOTO.petit}w, ${src} ${TAILLES_PHOTO.grand}w` : "",
    alt: texteAlt || altAuto(row.titre, row.categorie),
    texteAlt,
    accueil: row.accueil,
    banniere: !!row.banniere,
    visible: row.visible,
    ordre: row.ordre,
  };
}
