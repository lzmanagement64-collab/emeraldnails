import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";

import { Section } from "@/components/site/Section";
import {
  galleryCategories,
  galleryItems,
  type GalleryCategory,
  type GalleryItem,
} from "@/data/gallery";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/galerie")({
  component: GaleriePage,
  head: () => ({
    meta: [
      { title: "Galerie — Emerald Beauty" },
      {
        name: "description",
        content: "Nail art, french, nude, ongles longs et courts. Nos dernières réalisations.",
      },
      { property: "og:title", content: "Galerie" },
      { property: "og:url", content: "/galerie" },
    ],
    links: [{ rel: "canonical", href: "/galerie" }],
  }),
});

function ratioClass(ratio: GalleryItem["ratio"]) {
  if (ratio === "portrait") return "aspect-[3/4]";
  if (ratio === "wide") return "aspect-[2/1] col-span-2";
  return "aspect-square";
}

function GaleriePage() {
  const [active, setActive] = useState<GalleryCategory>("tout");
  const [open, setOpen] = useState<GalleryItem | null>(null);

  const filtered = useMemo(
    () =>
      active === "tout" ? galleryItems : galleryItems.filter((g) => g.categories.includes(active)),
    [active],
  );

  return (
    <>
      <Section eyebrow="Portfolio" title="Nos réalisations">
        <div className="mb-8 flex flex-wrap gap-2">
          {galleryCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                active === c.id
                  ? "border-ink bg-ink text-porcelain"
                  : "border-border text-taupe hover:border-ink hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {filtered.map((g) => (
            <button
              key={g.id}
              onClick={() => setOpen(g)}
              className={cn(
                "group relative overflow-hidden rounded-sm border border-border transition-transform",
                ratioClass(g.ratio),
              )}
              style={{ background: g.placeholder }}
              aria-label={`Voir ${g.title}`}
            >
              <img
                src={g.image}
                alt={g.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink/80 to-transparent p-3 text-left font-mono text-[10px] uppercase tracking-widest text-porcelain opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                {g.title}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur"
          onClick={() => setOpen(null)}
          role="dialog"
        >
          <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Fermer"
              onClick={() => setOpen(null)}
              className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full bg-porcelain text-ink"
            >
              <X className="size-4" />
            </button>
            <img
              src={open.image}
              alt={open.title}
              className="aspect-[4/5] w-full rounded-sm object-cover"
            />
            <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-porcelain">
              {open.title}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
