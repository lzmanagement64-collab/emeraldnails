import lilasFleursAsset from "@/assets/nails-lilas-fleurs.png.asset.json";
import lilasMilkyAsset from "@/assets/nails-lilas-milky.png.asset.json";
import vertLeopardAsset from "@/assets/nails-vert-leopard.png.asset.json";
import whiteFlowerAsset from "@/assets/nails-white-flower.png.asset.json";

const lilasFleurs = lilasFleursAsset as { url: string };
const lilasMilky = lilasMilkyAsset as { url: string };
const vertLeopard = vertLeopardAsset as { url: string };
const whiteFlower = whiteFlowerAsset as { url: string };

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
  placeholder: string;
};

export const galleryItems: GalleryItem[] = [
  {
    id: "1",
    categories: ["french", "nail-art", "long"],
    title: "French lilas · floral violet",
    image: lilasFleurs.url,
    ratio: "portrait",
    placeholder: "linear-gradient(135deg, #d8c6e2, #a377c4)",
  },
  {
    id: "2",
    categories: ["nude", "long"],
    title: "Milky lilac · finition glossy",
    image: lilasMilky.url,
    ratio: "square",
    placeholder: "linear-gradient(135deg, #ece7f2, #c9bde0)",
  },
  {
    id: "3",
    categories: ["couleur", "nail-art", "long"],
    title: "Vert sauge · léopard doré",
    image: vertLeopard.url,
    ratio: "portrait",
    placeholder: "linear-gradient(135deg, #a8bfa0, #4a6741)",
  },
  {
    id: "4",
    categories: ["nude", "nail-art", "long"],
    title: "Blanc laiteux · fleur 3D",
    image: whiteFlower.url,
    ratio: "square",
    placeholder: "linear-gradient(135deg, #faf9f6, #e6d1d4)",
  },
  {
    id: "5",
    categories: ["french", "nail-art", "long"],
    title: "French lilas · fleurs violettes",
    image: lilasFleurs.url,
    ratio: "wide",
    placeholder: "linear-gradient(135deg, #d8c6e2, #a377c4)",
  },
];
