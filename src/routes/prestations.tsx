import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { ServiceCard } from "@/components/site/ServiceCard";
import { services } from "@/data/services";

export const Route = createFileRoute("/prestations")({
  component: PrestationsPage,
  head: () => ({
    meta: [
      { title: "Prestations & tarifs — Atelier Porcelaine" },
      {
        name: "description",
        content:
          "Pose gel, semi-permanent, gainage, remplissage, nail art, beauté des pieds. Tarifs et durées.",
      },
      { property: "og:title", content: "Prestations & tarifs" },
      { property: "og:url", content: "/prestations" },
    ],
    links: [{ rel: "canonical", href: "/prestations" }],
  }),
});

const groups = [
  { id: "naturels", label: "Ongles naturels" },
  { id: "gel", label: "Extension gel" },
  { id: "gelx", label: "Gel-X" },
  { id: "nailart", label: "Nail art" },
] as const;

function PrestationsPage() {
  return (
    <>
      <Section eyebrow="Prestations" title="Tarifs et durées">
        <p className="max-w-2xl text-taupe">
          Les tarifs affichés sont indicatifs. Le prix final peut varier selon la complexité
          du nail art ou la longueur souhaitée. Chaque prestation inclut la manucure russe.
        </p>
      </Section>

      {groups.map((g) => {
        const items = services.filter((s) => s.category === g.id);
        if (!items.length) return null;
        return (
          <Section key={g.id} eyebrow={g.label} className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}
