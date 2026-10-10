import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PhotoGalerie } from "@/lib/galerie";
import { libelleCategorie } from "@/lib/galerie";

/** Photo en plein écran : flèches, clavier (← → Échap) et glissement du doigt. */
export function Visionneuse({
  photos,
  index,
  onChange,
  onClose,
}: {
  photos: PhotoGalerie[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const depart = useRef<number | null>(null);
  const precedente = () => onChange((index - 1 + photos.length) % photos.length);
  const suivante = () => onChange((index + 1) % photos.length);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") precedente();
      if (e.key === "ArrowRight") suivante();
    };
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", touche);
    return () => {
      document.body.style.overflow = ancien;
      window.removeEventListener("keydown", touche);
    };
  });

  if (!photo) return null;
  // Affichée à la racine de la page : un bloc animé parent ne peut pas la rétrécir.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.titre || "Photo"}
      className="fixed inset-0 z-50 flex flex-col bg-emerald-deep/95 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
      onTouchStart={(e) => (depart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (depart.current === null) return;
        const ecart = e.changedTouches[0].clientX - depart.current;
        if (Math.abs(ecart) > 50) (ecart > 0 ? precedente : suivante)();
        depart.current = null;
      }}
    >
      <div className="flex items-center justify-between p-4 text-porcelain">
        <p className="text-sm text-porcelain/70">
          {index + 1} / {photos.length}
        </p>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="grid size-11 place-items-center rounded-full bg-porcelain/10 hover:bg-porcelain/20"
        >
          <X className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <img
          key={photo.id}
          src={photo.src}
          alt={photo.titre}
          className="max-h-full max-w-full rounded-3xl object-contain shadow-2xl animate-in zoom-in-95 fade-in duration-500"
          onClick={(e) => e.stopPropagation()}
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              onClick={(e) => {
                e.stopPropagation();
                precedente();
              }}
              className="absolute left-3 hidden size-12 place-items-center rounded-full bg-porcelain/10 text-porcelain hover:bg-porcelain/20 sm:grid"
            >
              <ChevronLeft className="size-6" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              onClick={(e) => {
                e.stopPropagation();
                suivante();
              }}
              className="absolute right-3 hidden size-12 place-items-center rounded-full bg-porcelain/10 text-porcelain hover:bg-porcelain/20 sm:grid"
            >
              <ChevronRight className="size-6" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-porcelain">
        {photo.titre && <p className="font-display text-2xl">{photo.titre}</p>}
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-porcelain/60">
          {libelleCategorie(photo.categorie)}
        </p>
      </div>
    </div>,
    document.body,
  );
}
