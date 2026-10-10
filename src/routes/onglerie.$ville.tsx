import { prixAffiche } from "@/lib/selection";
import { createFileRoute, getRouteApi, Link, notFound } from "@tanstack/react-router";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { Section } from "@/components/site/Section";
import { areas } from "@/data/areas";
import { business, SITE_URL } from "@/config/business";
import { chargerPrestations, resumeJoursOuverture } from "@/lib/site-data";

export const Route = createFileRoute("/onglerie/$ville")({
  component: AreaPage,
  loader: async ({ params }) => {
    const area = areas.find((a) => a.slug === params.ville);
    if (!area) throw notFound();
    return { area, prestations: await chargerPrestations() };
  },
  head: ({ params, loaderData }) => {
    const area = loaderData?.area;
    if (!area) return {};
    const title = `Prothésiste ongulaire ${area.city} (${area.postalCode}) — Pose gel & nail art | ${business.name}`;
    const description = `Onglerie près de ${area.city} : extension gel, Gel X, semi-permanent et nail art par Maria, prothésiste ongulaire à Lons, à ${area.travelTime} de ${area.city}. Réservation en ligne 24/7.`;
    const url = `${SITE_URL}/onglerie/${params.ville}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BeautySalon",
            name: `${business.name} — onglerie ${area.city}`,
            description,
            url,
            telephone: business.phone,
            priceRange: "€€",
            address: {
              "@type": "PostalAddress",
              streetAddress: "7 Imp. d'Ossau",
              addressLocality: "Lons",
              postalCode: "64140",
              addressCountry: "FR",
            },
            areaServed: { "@type": "City", name: area.city },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: "Zones",
                item: `${SITE_URL}/onglerie/${params.ville}`,
              },
              { "@type": "ListItem", position: 3, name: area.city },
            ],
          }),
        },
      ],
    };
  },
});

const rootRoute = getRouteApi("__root__");

function AreaPage() {
  const { area, prestations } = Route.useLoaderData();
  const { horaires } = rootRoute.useLoaderData();
  const others = areas.filter((a) => a.slug !== area.slug);

  return (
    <>
      <Section
        as="h1"
        eyebrow={`Onglerie · ${area.city} ${area.postalCode}`}
        title={`Prothésiste ongulaire à ${area.city}`}
        description={area.intro}
      >
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5 text-sm leading-relaxed text-taupe">
            {area.paragraphs.map((p: string) => (
              <p key={p.slice(0, 30)}>{p}</p>
            ))}

            <h2 className="pt-4 font-display text-2xl text-ink">
              Nos prestations pour les clientes de {area.city}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {prestations.slice(0, 8).map((s) => (
                <li key={s.id} className="flex justify-between gap-4 border-b border-border py-2">
                  <span className="text-ink">{s.nom}</span>
                  <span>{prixAffiche(s)}</span>
                </li>
              ))}
            </ul>

            <p>Toutes les prestations se réservent en ligne, en quelques minutes.</p>

            <h2 className="pt-4 font-display text-2xl text-ink">Venir depuis {area.city}</h2>
            <p>
              Emerald Beauty se trouve au {business.address}, soit {area.distance} et environ{" "}
              {area.travelTime} depuis {area.city}. Stationnement gratuit devant l'établissement.
            </p>
            <ul className="flex flex-wrap gap-2">
              {area.landmarks.map((l: string) => (
                <li key={l} className="rounded-full border border-border px-3 py-1 text-xs">
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <aside className="h-fit space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-2 text-sm text-taupe">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>{business.address}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-taupe">
              <Clock className="mt-0.5 size-4 shrink-0" />
              <span>{resumeJoursOuverture(horaires)}</span>
            </div>
            <Link to="/reserver" className="btn-primaire w-full">
              Réserver depuis {area.city}
            </Link>
            <a href={`tel:${business.phone}`} className="btn-secondaire w-full">
              {business.phoneDisplay}
            </a>
          </aside>
        </div>

        <div className="mt-14 border-t border-border pt-8">
          <p className="eyebrow mb-4">Autres villes desservies</p>
          <div className="flex flex-wrap gap-3">
            {others.map((a) => (
              <Link
                key={a.slug}
                to="/onglerie/$ville"
                params={{ ville: a.slug }}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-ink"
              >
                Onglerie {a.city} <ArrowRight className="size-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
