import { SITE_URL } from "@/config/business";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarHeart, Layers, ShieldCheck } from "lucide-react";
import { Section } from "@/components/site/Section";
import { GrillePrix } from "@/components/site/GrillePrix";
import { chargerPrestations } from "@/lib/site-data";
import { ACOMPTE_TEXTE } from "@/lib/acompte";
import { ANNULATION_TEXTE, REGLE_ACOMPTE_TEXTE } from "@/lib/annulation";

export const Route = createFileRoute("/prestations")({
  component: PrestationsPage,
  loader: async () => ({ prestations: await chargerPrestations() }),
  head: () => ({
    meta: [
      { title: "Prestations & tarifs — Emerald Beauty" },
      {
        name: "description",
        content:
          "Semi-permanent, renforcement, remplissage, déposes, extension gel, Gel-X et nail art. Tarifs et durées.",
      },
      { property: "og:title", content: "Prestations & tarifs" },
      { property: "og:url", content: `${SITE_URL}/prestations` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/prestations` }],
  }),
});

function PrestationsPage() {
  const { prestations } = Route.useLoaderData();
  return (
    <>
      <Section
        as="h1"
        eyebrow="Prestations & tarifs"
        title="Tarifs et durées"
        description="Les tarifs sont indicatifs : le prix final peut varier selon la complexité du nail art ou la longueur souhaitée. Chaque prestation inclut la manucure."
        className="pb-8 sm:pb-12"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div data-apparait className="carte flex gap-4 p-5">
            <Layers className="size-5 shrink-0 text-emerald" strokeWidth={1.5} />
            <p className="text-sm text-taupe">
              Plusieurs prestations dans un même rendez-vous ? Les prix et les durées s'additionnent
              automatiquement à la réservation.
            </p>
          </div>
          <div
            data-apparait
            style={{ "--delai": "80ms" } as React.CSSProperties}
            className="carte flex gap-4 p-5"
          >
            <CalendarHeart className="size-5 shrink-0 text-emerald" strokeWidth={1.5} />
            <p className="text-sm text-taupe">
              {ACOMPTE_TEXTE} Il est déduit du montant total le jour du rendez-vous.
            </p>
          </div>
          <div
            data-apparait
            style={{ "--delai": "160ms" } as React.CSSProperties}
            className="carte flex gap-4 p-5"
          >
            <ShieldCheck className="size-5 shrink-0 text-emerald" strokeWidth={1.5} />
            <p className="text-sm text-taupe">{REGLE_ACOMPTE_TEXTE}</p>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <GrillePrix prestations={prestations} />
        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-taupe">{ANNULATION_TEXTE}</p>
          <Link to="/reserver" className="btn-primaire">
            <CalendarHeart className="size-[18px]" strokeWidth={1.6} />
            Réserver en ligne
          </Link>
        </div>
      </Section>
    </>
  );
}
