import { createFileRoute, Link } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { business } from "@/config/business";

export const Route = createFileRoute("/a-propos")({
  component: AProposPage,
  head: () => ({
    meta: [
      { title: "L'atelier — Emerald Beauty" },
      {
        name: "description",
        content: `Découvrez l'univers et l'approche de ${business.founder}, prothésiste ongulaire à ${business.city}.`,
      },
      { property: "og:title", content: "L'atelier" },
      { property: "og:url", content: "/a-propos" },
    ],
    links: [{ rel: "canonical", href: "/a-propos" }],
  }),
});

function AProposPage() {
  return (
    <Section eyebrow="L'atelier" title={`Rencontre avec ${business.founder}`}>
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr] md:items-start">
        <div
          className="aspect-[3/4] w-full rounded-sm border border-border"
          style={{ background: "linear-gradient(135deg, #ede6d8, #b8ac97)" }}
          aria-label={`Portrait de ${business.founder}`}
        />
        <div className="space-y-5 text-taupe">
          <p className="font-display text-2xl italic text-ink">
            « L'ongle soigné est un détail qui change tout. Il révèle une élégance discrète,
            quotidienne. »
          </p>
          <p>
            Passionnée par le geste précis et l'esthétique naturelle, {business.founder} a fondé{" "}
            {business.name} pour offrir un accompagnement sur-mesure loin de l'industrialisation des
            salons classiques.
          </p>
          <p>
            Formée à la manucure russe et diplômée d'onglerie, elle place la santé de l'ongle au
            cœur de chaque rendez-vous. Chaque cliente bénéficie d'un temps d'échange avant la
            prestation pour définir ensemble la forme, la longueur et l'univers souhaité.
          </p>
          <div className="grid grid-cols-3 gap-6 border-y border-border py-6">
            {[
              { k: "6 ans", v: "d'expérience" },
              { k: "1 800+", v: "poses réalisées" },
              { k: "100 %", v: "sur rendez-vous" },
            ].map((s) => (
              <div key={s.k}>
                <p className="font-display text-2xl text-ink">{s.k}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-taupe">
                  {s.v}
                </p>
              </div>
            ))}
          </div>
          <div>
            <Link
              to="/reserver"
              className="inline-block rounded-sm bg-ink px-7 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain"
            >
              Réserver un rendez-vous
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
