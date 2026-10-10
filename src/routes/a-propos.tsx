import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarHeart } from "lucide-react";
import { Section } from "@/components/site/Section";
import { business } from "@/config/business";
import { cn } from "@/lib/utils";
import { DEROULEMENT, SAVOIR_FAIRE } from "@/data/savoir-faire";
import { chargerGalerie } from "@/lib/site-data";

export const Route = createFileRoute("/a-propos")({
  component: SavoirFairePage,
  loader: async () => ({ photos: await chargerGalerie() }),
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
  const { photos } = Route.useLoaderData();
  const accueil = photos.filter((p) => p.accueil);
  const [p1, p2] = accueil.length >= 2 ? accueil : photos;
  return (
    <>
      <Section as="h1" eyebrow="Savoir-faire" title={`${business.name}, prothésiste ongulaire`}>
        <div className="grid gap-3 md:grid-cols-12 md:gap-4">
          <div data-apparait className="fond-aurore rounded-[2rem] p-7 sm:p-10 md:col-span-7">
            <p className="font-display text-3xl leading-snug text-ink sm:text-4xl">
              {business.name} est l'établissement de {business.founder}, prothésiste ongulaire à{" "}
              {business.city}.
            </p>
            <p className="mt-6 max-w-xl text-taupe">
              Les prestations sont réalisées sur rendez-vous, avec soin et dans le respect de
              l'ongle naturel. Chaque rendez-vous commence par un échange pour définir ensemble la
              forme, la longueur et le style qui vous correspondent.
            </p>
            <Link to="/reserver" className="btn-primaire mt-8">
              <CalendarHeart className="size-[18px]" strokeWidth={1.6} />
              Réserver un rendez-vous
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:col-span-5 md:gap-4">
            {[p1, p2].filter(Boolean).map((p, i) => (
              <div
                key={p.id}
                data-apparait
                style={{ "--delai": `${i * 100}ms` } as React.CSSProperties}
                className={cn(
                  "photo-zoom overflow-hidden rounded-[1.75rem] bg-sand",
                  i === 0 ? "mt-8 aspect-[3/4]" : "aspect-[3/4]",
                )}
              >
                <img
                  src={p.vignette}
                  alt={p.titre || "Réalisation Emerald Beauty"}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
          {SAVOIR_FAIRE.map((v, i) => (
            <div
              key={v.title}
              data-apparait
              style={{ "--delai": `${i * 90}ms` } as React.CSSProperties}
              className="carte p-7 md:col-span-4"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-sage-soft text-emerald">
                <v.icon className="size-5" strokeWidth={1.5} />
              </span>
              <h2 className="mt-6 font-display text-3xl text-ink">{v.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-taupe">{v.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Le rendez-vous" title="Comment ça se passe" className="pt-0">
        <ol className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          {DEROULEMENT.map((step, i) => (
            <li
              key={step.n}
              data-apparait
              style={{ "--delai": `${i * 80}ms` } as React.CSSProperties}
              className="carte p-6"
            >
              <p className="font-display text-5xl text-emerald/40">{step.n}</p>
              <h3 className="mt-2 font-display text-2xl text-ink">{step.t}</h3>
              <p className="mt-1 text-sm text-taupe">{step.d}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
