import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarHeart, Instagram } from "lucide-react";

import { Section } from "@/components/site/Section";
import { GaleriePhotos } from "@/components/site/GaleriePhotos";
import { chargerGalerie } from "@/lib/site-data";
import { CATEGORIES_GALERIE } from "@/lib/galerie";
import { business, SITE_URL } from "@/config/business";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/galerie")({
  component: GaleriePage,
  loader: async () => ({ photos: await chargerGalerie() }),
  head: () => ({
    meta: [
      { title: "Galerie — Emerald Beauty" },
      {
        name: "description",
        content:
          "Nail art, french, nude, ongles longs et courts : les réalisations Emerald Beauty.",
      },
      { property: "og:title", content: "Galerie — Emerald Beauty" },
      { property: "og:url", content: `${SITE_URL}/galerie` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/galerie` }],
  }),
});

function GaleriePage() {
  const { photos } = Route.useLoaderData();
  const [filtre, setFiltre] = useState<string>("tout");

  // Seules les catégories qui ont des photos sont proposées.
  const categories = useMemo(
    () => CATEGORIES_GALERIE.filter((c) => photos.some((p) => p.categorie === c.id)),
    [photos],
  );
  const affichees = useMemo(
    () => (filtre === "tout" ? photos : photos.filter((p) => p.categorie === filtre)),
    [photos, filtre],
  );

  return (
    <Section
      as="h1"
      eyebrow="Galerie"
      title="Réalisations"
      description="Touchez une photo pour l'afficher en grand. Sur téléphone, faites glisser pour voir les suivantes."
    >
      <div className="defile-x -mx-4 mb-6 gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ id: "tout", label: "Tout" }, ...categories].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFiltre(c.id)}
            aria-pressed={filtre === c.id}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
              filtre === c.id
                ? "border-emerald bg-emerald text-porcelain"
                : "border-border bg-porcelain/70 text-taupe hover:border-emerald/40 hover:text-ink",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div key={filtre} className="reveal">
        <GaleriePhotos photos={affichees} />
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Link to="/reserver" className="btn-primaire">
          <CalendarHeart className="size-[18px]" strokeWidth={1.6} />
          Prendre rendez-vous
        </Link>
        <a href={business.instagramUrl} target="_blank" rel="noreferrer" className="btn-secondaire">
          <Instagram className="size-4" strokeWidth={1.6} />
          {business.instagram}
        </a>
      </div>
    </Section>
  );
}
