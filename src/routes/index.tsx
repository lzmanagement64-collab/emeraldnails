import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Section } from "@/components/site/Section";
import { ServiceCard } from "@/components/site/ServiceCard";
import { chargerPrestations } from "@/lib/site-data";
import { testimonials, reviewsSummary } from "@/data/testimonials";
import { galleryItems } from "@/data/gallery";
import { areas } from "@/data/areas";
import { SAVOIR_FAIRE, DEROULEMENT } from "@/data/savoir-faire";
import { business, SITE_URL } from "@/config/business";
import { ACOMPTE_TEXTE } from "@/lib/acompte";

const TITLE = "Prothésiste ongulaire Pau & Lons (64) — Pose gel, Gel X & nail art | Emerald Beauty";
const DESC =
  "Prothésiste ongulaire à Lons près de Pau : semi-permanent, renforcement, extension gel, Gel X et nail art par Maria. Réservation en ligne 24/7.";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => ({ prestations: await chargerPrestations() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BeautySalon",
          name: business.name,
          description: DESC,
          url: SITE_URL,
          telephone: business.phone,
          email: business.email,
          priceRange: "€€",
          image: `${SITE_URL}/favicon.ico`,
          address: {
            "@type": "PostalAddress",
            streetAddress: "7 Imp. d'Ossau",
            addressLocality: "Lons",
            postalCode: "64140",
            addressRegion: "Nouvelle-Aquitaine",
            addressCountry: "FR",
          },
          areaServed: business.serviceArea.map((c) => ({ "@type": "City", name: c })),
        }),
      },
    ],
  }),
});

function Index() {
  const { prestations } = Route.useLoaderData();
  const featured = prestations.slice(0, 6);
  const heroGallery = galleryItems.slice(0, 4);

  return (
    <>
      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div className="reveal">
            <p className="eyebrow mb-6">Prothésiste ongulaire · {business.city}</p>
            <h1 className="font-display text-[2.75rem] leading-[1.05] text-ink sm:text-6xl">
              Des ongles élégants,
              <br />
              <span className="italic">soignés et personnalisés</span> selon votre style.
            </h1>
            <p className="mt-6 max-w-md text-base text-taupe sm:text-lg">
              Chaque prestation est réalisée avec précision, écoute et attention, dans le respect de
              l'ongle naturel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/reserver"
                className="rounded-sm bg-ink px-7 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain transition-opacity hover:opacity-90"
              >
                Prendre rendez-vous
              </Link>
              <Link
                to="/prestations"
                className="rounded-sm border border-border px-7 py-4 font-mono text-[11px] uppercase tracking-widest text-ink transition-colors hover:bg-linen"
              >
                Voir les prestations
              </Link>
            </div>
          </div>

          <div className="reveal relative">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-sm border border-border bg-linen">
              <img
                src={heroGallery[0]?.image}
                alt={heroGallery[0]?.title ?? "Réalisation Emerald Beauty"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden max-w-[220px] rounded-sm border border-border bg-card p-5 shadow-[0_30px_60px_-30px_rgba(13,46,31,0.35)] md:block">
              <p className="eyebrow mb-2">Prothésiste ongulaire à {business.city}</p>
              <p className="font-display text-lg leading-tight text-ink">
                L'art d'un ongle soigné, sans compromis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 1. PRESTATIONS */}
      <Section eyebrow="Prestations" title="Nos prestations">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
        <div className="mt-10">
          <Link
            to="/prestations"
            className="inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[11px] uppercase tracking-widest"
          >
            Toutes les prestations et tarifs <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </Section>

      {/* 2. RÉALISATIONS */}
      <Section eyebrow="Portfolio" title="Réalisations récentes" className="bg-linen/40">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {heroGallery.map((g) => (
            <div
              key={g.id}
              className="aspect-square overflow-hidden rounded-sm border border-border bg-linen"
            >
              <img
                src={g.image}
                alt={g.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link
            to="/galerie"
            className="inline-flex items-center gap-2 border-b border-ink pb-1 font-mono text-[11px] uppercase tracking-widest"
          >
            Voir la galerie <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </Section>

      {/* 3. SAVOIR-FAIRE */}
      <Section eyebrow="Savoir-faire" title="Un travail soigné, à chaque étape">
        <div className="grid gap-6 md:grid-cols-3">
          {SAVOIR_FAIRE.map((v) => (
            <div key={v.title} className="rounded-sm border border-border bg-card p-6">
              <v.icon className="mb-5 size-5 text-bordeaux" />
              <h3 className="font-display text-xl text-ink">{v.title}</h3>
              <p className="mt-2 text-sm text-taupe">{v.text}</p>
            </div>
          ))}
        </div>
        <ol className="mt-14 grid gap-8 md:grid-cols-4">
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

      {/* AVIS (Planity) */}
      <Section
        eyebrow="Avis"
        title="Ce qu'elles en disent"
        description={`Avis laissés par des clientes sur ${reviewsSummary.source}.`}
        className="bg-ink text-porcelain"
      >
        <div className="grid gap-8 md:grid-cols-2">
          {testimonials.slice(0, 4).map((t) => (
            <blockquote key={t.id} className="border-t border-porcelain/20 pt-6">
              <p className="mb-2 text-bordeaux">{"★".repeat(t.rating)}</p>
              <p className="font-display text-xl italic leading-relaxed">« {t.text} »</p>
              <footer className="mt-4 font-mono text-[10px] uppercase tracking-widest text-porcelain/60">
                {t.firstName} — {t.service}
              </footer>
            </blockquote>
          ))}
        </div>
      </Section>

      {/* 4. PRISE DE RENDEZ-VOUS */}
      <Section>
        <div className="rounded-sm border border-border bg-linen/60 px-6 py-14 text-center sm:px-12">
          <p className="eyebrow mb-4">Réservation</p>
          <h2 className="mx-auto max-w-xl font-display text-3xl leading-tight sm:text-4xl">
            Prête à réserver votre créneau ?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-taupe">
            Choisissez votre prestation et votre créneau en quelques étapes. {ACOMPTE_TEXTE}
          </p>
          <Link
            to="/reserver"
            className="mt-8 inline-block rounded-sm bg-ink px-8 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain"
          >
            Prendre rendez-vous
          </Link>
        </div>
      </Section>

      {/* ZONES DESSERVIES — SEO LOCAL */}
      <Section
        eyebrow="Secteur 64"
        title="Pour toute l'agglomération paloise"
        description="Emerald Beauty reçoit les clientes de Pau et des communes voisines à Lons."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((a) => (
            <Link
              key={a.slug}
              to="/onglerie/$ville"
              params={{ ville: a.slug }}
              className="group rounded-sm border border-border bg-card p-6 transition-colors hover:border-ink"
            >
              <p className="font-display text-xl text-ink">{a.city}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-taupe">
                {a.postalCode} · {a.travelTime}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm text-taupe group-hover:text-ink">
                Voir la page <ArrowUpRight className="size-3.5" />
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
