// Catégories de la grille de prix, dans l'ordre d'affichage.
// Une catégorie créée dans l'admin et absente de cette liste s'affiche à la suite.
export const ORDRE_CATEGORIES = [
  "Ongles naturels",
  "Extension gel",
  "Gel-X",
  "Nail art",
  // Anciennes catégories (au cas où une prestation y serait encore rangée)
  "Semi-permanent",
  "Renforcement",
  "Déposes",
  "Homme",
];

/** Texte d'explication affiché sous certaines catégories. */
export const NOTE_CATEGORIE: Record<string, string> = {
  "Nail art": "En option, à ajouter à une pose.",
};

/** Regroupe des prestations par catégorie, dans l'ordre ci-dessus. */
export function parCategorie<T extends { categorie?: string | null }>(items: T[]) {
  const groupes = new Map<string, T[]>();
  for (const it of items) {
    const c = it.categorie?.trim() || "Autres";
    groupes.set(c, [...(groupes.get(c) ?? []), it]);
  }
  const rang = (c: string) => {
    const i = ORDRE_CATEGORIES.indexOf(c);
    return i === -1 ? ORDRE_CATEGORIES.length : i;
  };
  return [...groupes.entries()]
    .sort(([a], [b]) => rang(a) - rang(b) || a.localeCompare(b, "fr"))
    .map(([categorie, liste]) => ({ categorie, liste }));
}
