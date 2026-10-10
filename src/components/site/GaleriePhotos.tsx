import { useState } from "react";
import { Expand } from "lucide-react";
import type { PhotoGalerie } from "@/lib/galerie";
import { libelleCategorie } from "@/lib/galerie";
import { cn } from "@/lib/utils";
import { Visionneuse } from "./Visionneuse";

/**
 * Photos de réalisations : défilement horizontal fluide sur mobile,
 * grille éditoriale (blocs de tailles différentes) sur ordinateur,
 * ouverture en plein écran au toucher / au clic.
 */
export function GaleriePhotos({ photos }: { photos: PhotoGalerie[] }) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  if (!photos.length) {
    return <p className="text-taupe">Les réalisations arrivent bientôt.</p>;
  }

  const vignette = (p: PhotoGalerie, i: number, classe: string) => (
    <button
      key={p.id}
      type="button"
      onClick={() => setOuverte(i)}
      aria-label={`Agrandir : ${p.titre || libelleCategorie(p.categorie)}`}
      className={cn(
        "photo-zoom group relative overflow-hidden rounded-[1.75rem] bg-sand text-left",
        classe,
      )}
    >
      <img
        src={p.vignette}
        alt={p.titre || `Réalisation ${libelleCategorie(p.categorie)}`}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-deep/75 via-emerald-deep/10 to-transparent p-4 pt-16 text-porcelain">
        {p.titre && <span className="block font-display text-xl leading-tight">{p.titre}</span>}
        <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-porcelain/75">
          {libelleCategorie(p.categorie)}
        </span>
      </span>
      <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-porcelain/80 text-emerald opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        <Expand className="size-4" strokeWidth={1.5} />
      </span>
    </button>
  );

  return (
    <>
      {/* Mobile : glisser horizontalement */}
      <div className="defile-x -mx-4 gap-3 px-4 pb-2 md:hidden">
        {photos.map((p, i) => vignette(p, i, "aspect-[4/5] w-[78%] shrink-0"))}
      </div>

      {/* Ordinateur : grille éditoriale */}
      <div className="hidden auto-rows-[15rem] grid-cols-4 gap-4 md:grid">
        {photos.map((p, i) =>
          vignette(
            p,
            i,
            cn(
              "h-full w-full",
              i % 6 === 0 && "col-span-2 row-span-2",
              i % 6 === 3 && "row-span-2",
            ),
          ),
        )}
      </div>

      {ouverte !== null && (
        <Visionneuse
          photos={photos}
          index={ouverte}
          onChange={setOuverte}
          onClose={() => setOuverte(null)}
        />
      )}
    </>
  );
}
