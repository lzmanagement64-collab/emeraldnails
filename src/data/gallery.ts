export type GalleryCategory =
  | "tout"
  | "nude"
  | "french"
  | "nail-art"
  | "couleur"
  | "long"
  | "court";

export const galleryCategories: { id: GalleryCategory; label: string }[] = [
  { id: "tout", label: "Tout" },
  { id: "nude", label: "Nude" },
  { id: "french", label: "French" },
  { id: "nail-art", label: "Nail art" },
  { id: "couleur", label: "Couleur" },
  { id: "long", label: "Ongles longs" },
  { id: "court", label: "Ongles courts" },
];

export type GalleryItem = {
  id: string;
  categories: GalleryCategory[];
  title: string;
  // Emplacement image. À remplacer par un vrai fichier dans /public/gallery/ ou une URL.
  placeholder: string;
  ratio: "square" | "portrait" | "wide";
};

// Palette de dégradés doux — sert d'aperçu élégant tant que les vraies photos ne sont pas fournies.
export const galleryItems: GalleryItem[] = [
  { id: "1", categories: ["nude", "court"], title: "Nude porcelaine", placeholder: "linear-gradient(135deg, #f2eee8, #e8dfd3)", ratio: "portrait" },
  { id: "2", categories: ["french", "court"], title: "French moderne", placeholder: "linear-gradient(135deg, #faf9f6, #d9d1c7)", ratio: "square" },
  { id: "3", categories: ["nail-art", "long"], title: "Traits fins dorés", placeholder: "linear-gradient(135deg, #ede6d8, #c9bfae)", ratio: "square" },
  { id: "4", categories: ["couleur", "long"], title: "Bordeaux mat", placeholder: "linear-gradient(135deg, #7a3b34, #4a2321)", ratio: "wide" },
  { id: "5", categories: ["nude", "long"], title: "Amande milky", placeholder: "linear-gradient(135deg, #f5efe6, #e2d8c9)", ratio: "portrait" },
  { id: "6", categories: ["nail-art", "court"], title: "Micro-lignes", placeholder: "linear-gradient(135deg, #eee7dc, #b8ac97)", ratio: "square" },
  { id: "7", categories: ["couleur", "court"], title: "Terracotta sourd", placeholder: "linear-gradient(135deg, #c48b6b, #8b5a44)", ratio: "square" },
  { id: "8", categories: ["french", "long"], title: "French inversée", placeholder: "linear-gradient(135deg, #faf9f6, #ded4c4)", ratio: "wide" },
];
