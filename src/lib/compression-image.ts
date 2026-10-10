// ============================================================
// Allègement des photos dans le navigateur, avant l'envoi.
// Une photo de téléphone (3 à 8 Mo) devient deux fichiers légers :
// « grand » (1600 px) pour le plein écran, « petit » (720 px) pour les
// vignettes et le mobile. Format WebP, ou JPEG si le navigateur ne sait
// pas produire de WebP (certains iPhone).
// ============================================================
import { TAILLES_PHOTO } from "./galerie";

async function encoder(canvas: HTMLCanvasElement): Promise<Blob> {
  const essai = (type: string, qualite: number) =>
    new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, qualite));
  const webp = await essai("image/webp", 0.82);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await essai("image/jpeg", 0.85);
  if (!jpeg) throw new Error("Impossible de préparer cette photo.");
  return jpeg;
}

async function redimensionner(image: ImageBitmap, coteMax: number) {
  const echelle = Math.min(1, coteMax / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer cette photo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return encoder(canvas);
}

/** Prépare les deux versions allégées d'une photo choisie sur le téléphone. */
export async function preparerPhoto(fichier: File) {
  if (!fichier.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une photo.");
  // « from-image » : la photo garde le bon sens (portrait / paysage).
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  try {
    const [grand, petit] = await Promise.all([
      redimensionner(image, TAILLES_PHOTO.grand),
      redimensionner(image, TAILLES_PHOTO.petit),
    ]);
    return { grand, petit };
  } finally {
    image.close();
  }
}
