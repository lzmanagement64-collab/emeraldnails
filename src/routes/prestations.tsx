import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { ServiceCard } from "@/components/site/ServiceCard";
import { chargerPrestations } from "@/lib/site-data";
import { ACOMPTE_TEXTE } from "@/lib/acompte";

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
      { property: "og:url", content: "/prestations" },
    ],
    links: [{ rel: "canonical", href: "/prestations" }],
  }),
});

function PrestationsPage() {
  const { prestations } = Route.useLoaderData();
  return (
    <>
      <Section eyebrow="Prestations" title="Tarifs et durées">
        <p className="max-w-2xl text-taupe">
          Les tarifs affichés sont indicatifs. Le prix final peut varier selon la complexité du nail
          art ou la longueur souhaitée. Chaque prestation inclut la manucure.
        </p>
        <p className="mt-4 max-w-2xl rounded-sm border border-border bg-card p-4 text-sm text-taupe">
          {ACOMPTE_TEXTE} Il est déduit du montant total le jour du rendez-vous.
        </p>
      </Section>

      {/* Prestations actives, dans l'ordre défini depuis l'admin. */}
      <Section className="pt-0">
        {prestations.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prestations.map((p) => (
              <ServiceCard key={p.id} service={p} />
            ))}
          </div>
        ) : (
          <p className="text-taupe">Les prestations sont momentanément indisponibles.</p>
        )}
      </Section>
    </>
  );
}
