import { createFileRoute, Link } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { business } from "@/config/business";
import { DEROULEMENT, SAVOIR_FAIRE } from "@/data/savoir-faire";
import { galleryItems } from "@/data/gallery";

export const Route = createFileRoute("/a-propos")({
  component: SavoirFairePage,
  head: () => ({
    meta: [
      { title: "Savoir-faire — Emerald Beauty" },
      {
        name: "description",
        content: `Le savoir-faire d'${business.name}, prothésiste ongulaire à ${business.city} : écoute, précision et soin de l'ongle naturel.`,
      },
      { property: "og:title", content: "Savoir-faire — Emerald Beauty" },
      { property: "og:url", content: "/a-propos" },
    ],
    links: [{ rel: "canonical", href: "/a-propos" }],
  }),
});

// Texte volontairement neutre : aucune information sur le parcours, les diplômes
// ou l'expérience tant qu'elle n'a pas été fournie et validée par la gérante.
function SavoirFairePage() {
  const photo = galleryItems[0];
  return (
    <>
      <Section eyebrow="Savoir-faire" title={`${business.name}, prothésiste ongulaire`}>
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr] md:items-start">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-sm border border-border bg-linen">
            {photo && (
              <img src={photo.image} alt={photo.title} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="space-y-5 text-taupe">
            <p>
              {business.name} est l'établissement de {business.founder}, prothésiste ongulaire à{" "}
              {business.city}. Les prestations sont réalisées sur rendez-vous, avec soin et dans le
              respect de l'ongle naturel.
            </p>
            <p>
              Chaque rendez-vous commence par un échange pour définir ensemble la forme, la longueur
              et le style qui vous correspondent.
            </p>
            <ul className="space-y-4 border-y border-border py-6">
              {SAVOIR_FAIRE.map((v) => (
                <li key={v.title}>
                  <p className="font-display text-lg text-ink">{v.title}</p>
                  <p className="mt-1 text-sm">{v.text}</p>
                </li>
              ))}
            </ul>
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

      <Section eyebrow="Le rendez-vous" title="Comment ça se passe" className="pt-0">
        <ol className="grid gap-8 md:grid-cols-4">
          {DEROULEMENT.map((step) => (
            <li key={step.n} className="border-t border-border pt-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-bordeaux">
                {step.n}
              </p>
              <h3 className="mt-3 font-display text-xl text-ink">{step.t}</h3>
              <p className="mt-2 text-sm text-taupe">{step.d}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
