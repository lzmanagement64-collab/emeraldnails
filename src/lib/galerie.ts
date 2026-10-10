// ============================================================
// Galerie : catégories et format des photos (site + admin).
// Les photos sont gérées par la gérante dans l'admin (table galerie_photos,
// fichiers dans le stockage « galerie »). Si la base est injoignable,
// le site affiche les photos d'origine (src/data/gallery.ts).
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
  accueil: boolean;
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
};

/** Adresses publiques des deux tailles d'une photo. */
export function versPhoto(row: LigneGalerie, supabaseUrl: string): PhotoGalerie {
  const base = row.chemin
    ? `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/galerie/${row.chemin}`
    : null;
  return {
    id: row.id,
    titre: row.titre,
    categorie: row.categorie,
    src: base ? `${base}/grand.webp` : (row.url_statique ?? ""),
    vignette: base ? `${base}/petit.webp` : (row.url_statique ?? ""),
    accueil: row.accueil,
    visible: row.visible,
    ordre: row.ordre,
  };
}
