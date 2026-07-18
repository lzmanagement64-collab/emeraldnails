import img1Asset from "@/assets/IMG_1974.png.asset.json";
import img2Asset from "@/assets/IMG_1973.png.asset.json";
import img3Asset from "@/assets/IMG_1975.png.asset.json";
import img4Asset from "@/assets/IMG_1974.png.asset.json";
import img5Asset from "@/assets/IMG_1980.png.asset.json";

const img1 = img1Asset as { url: string };
const img2 = img2Asset as { url: string };
const img3 = img3Asset as { url: string };
const img4 = img4Asset as { url: string };
const img5 = img5Asset as { url: string };

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
  image: string;
  ratio: "square" | "portrait" | "wide";
  /** Fallback dégradé (utilisé si l'image n'est pas disponible). */
  placeholder: string;
};

export const galleryItems: GalleryItem[] = [
  {
    id: "1",
    categories: ["nude", "long", "nail-art"],
    title: "Nude nacré · fleur 3D",
    image: img1.url,
    ratio: "portrait",
    placeholder: "linear-gradient(135deg, #f2eee8, #e8dfd3)",
  },
  {
    id: "2",
    categories: ["nude", "long", "nail-art"],
    title: "Rose milky · relief floral",
    image: img2.url,
    ratio: "square",
    placeholder: "linear-gradient(135deg, #faf9f6, #e6d1d4)",
  },
  {
    id: "3",
    categories: ["couleur", "nail-art", "court"],
    title: "Vert sauge · touches dorées",
    image: img3.url,
    ratio: "square",
    placeholder: "linear-gradient(135deg, #a8bfa0, #4a6741)",
  },
  {
    id: "4",
    categories: ["nude", "long"],
    title: "Pose gel Milky",
    image: img4.url,
    ratio: "portrait",
    placeholder: "linear-gradient(135deg, #f5efe6, #e2d8c9)",
  },
  {
    id: "5",
    categories: ["french", "nail-art", "long"],
    title: "French lilas · floral violet",
    image: img5.url,
    ratio: "wide",
    placeholder: "linear-gradient(135deg, #d8c6e2, #a377c4)",
  },
];
