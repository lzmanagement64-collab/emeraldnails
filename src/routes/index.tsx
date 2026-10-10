import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarHeart, Car, MapPin, Phone, Quote, Star } from "lucide-react";

import { Section } from "@/components/site/Section";
import { GaleriePhotos } from "@/components/site/GaleriePhotos";
import { chargerGalerie, chargerPrestations } from "@/lib/site-data";
import { parCategorie } from "@/lib/categories";
import { testimonials, reviewsSummary } from "@/data/testimonials";
import { areas } from "@/data/areas";
import { SAVOIR_FAIRE, DEROULEMENT } from "@/data/savoir-faire";
import { business, SITE_URL } from "@/config/business";
import { ACOMPTE_TEXTE, POURCENT_ACOMPTE } from "@/lib/acompte";
import { formatDuree, formatEuros } from "@/lib/tz";
import { prixAffiche, prixMinimum } from "@/lib/selection";
import { cn } from "@/lib/utils";

const TITLE = "Prothésiste ongulaire Pau & Lons (64) — Pose gel, Gel X & nail art | Emerald Beauty";
const DESC =
  "Prothésiste ongulaire à Lons près de Pau : semi-permanent, renforcement, extension gel, Gel X et nail art par Maria. Réservation en ligne 24/7.";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => {
    const [prestations, photos] = await Promise.all([chargerPrestations(), chargerGalerie()]);
    return { prestations, photos };
  },
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
          image: `${SITE_URL}/og-image.png`,
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
  const { prestations, photos } = Route.useLoaderData();
  // Photos choisies par Maria pour l'accueil (« Accueil » dans l'admin).
  const accueil = photos.filter((p) => p.accueil);
  const selection = accueil.length ? accueil : photos;
  const banniere = selection[0];
  const realisations = (selection.length > 1 ? selection.slice(1) : photos).slice(0, 7);
  const categories = parCategorie(prestations);

  return (
    <>
      {/* 1. BANNIÈRE */}
      <section className="px-3 pb-6 pt-4 sm:px-5 sm:pt-6">
        <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-12 md:gap-4">
          <div className="fond-aurore reveal relative overflow-hidden rounded-[2rem] p-7 sm:p-10 md:col-span-7 md:flex md:flex-col md:justify-between md:p-12">
            <div>
              <p className="eyebrow">Prothésiste ongulaire · {business.city}</p>
              <h1 className="mt-5 font-display text-[3.3rem] leading-[0.95] text-ink sm:text-7xl lg:text-[5.5rem]">
                Des ongles <em className="text-emerald">élégants</em>, soignés et pensés pour vous.
              </h1>
              <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-taupe">
                Semi-permanent, renforcement, extension gel, Gel-X et nail art, réalisés avec
                précision et dans le respect de l'ongle naturel.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/reserver" className="btn-primaire">
                <CalendarHeart className="size-[18px]" strokeWidth={1.6} />
                Prendre rendez-vous
              </Link>
              <Link to="/prestations" className="btn-secondaire">
                Voir les tarifs
              </Link>
            </div>
          </div>

          <div className="relative md:col-span-5">
            {banniere && (
              <div className="photo-zoom reveal relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-sand md:aspect-auto md:h-full md:min-h-[34rem]">
                <img
                  src={banniere.src}
                  alt={banniere.titre || "Réalisation Emerald Beauty"}
                  fetchPriority="high"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-porcelain/85 px-3.5 py-2 text-xs font-semibold text-ink backdrop-blur">
                    <MapPin className="size-3.5 text-emerald" strokeWidth={1.6} />
                    {business.city}, près de Pau
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-porcelain/85 px-3.5 py-2 text-xs font-semibold text-ink backdrop-blur">
                    <Car className="size-3.5 text-emerald" strokeWidth={1.6} />
                    Stationnement gratuit
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. PRESTATIONS — grille bento par catégorie */}
      <Section
        eyebrow="Prestations"
        title="Nos prestations"
        description={`Tarifs clairs, réservation en ligne. ${ACOMPTE_TEXTE}`}
        action={
          <Link to="/prestations" className="btn-secondaire !py-3">
            Tous les tarifs <ArrowUpRight className="size-4" strokeWidth={1.6} />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-6 md:gap-4">
          {categories.map(({ categorie, liste }, i) => {
            const vedette = i === 0;
            return (
              <Link
                key={categorie}
                to="/prestations"
                data-apparait
                style={{ "--delai": `${(i % 3) * 80}ms` } as React.CSSProperties}
                className={cn(
                  "group flex flex-col justify-between rounded-[1.75rem] p-6 transition-transform duration-500 hover:-translate-y-1",
                  vedette
                    ? "fond-emeraude min-h-[15rem] sm:col-span-2 md:col-span-3 md:row-span-2"
                    : i <= 2
                      ? "carte md:col-span-3"
                      : "carte md:col-span-2",
                )}
              >
                <div>
                  <p className={cn("eyebrow", vedette && "!text-porcelain/70")}>
                    {prixMinimum(liste) !== null
                      ? `dès ${formatEuros(prixMinimum(liste) ?? 0)}`
                      : "sur devis"}
                  </p>
                  <h3
                    className={cn(
                      "mt-3 font-display text-4xl leading-none",
                      vedette ? "text-porcelain sm:text-5xl" : "text-ink",
                    )}
                  >
                    {categorie}
                  </h3>
                </div>
                <ul
                  className={cn(
                    "mt-6 space-y-2 text-sm",
                    vedette ? "text-porcelain/85" : "text-taupe",
                  )}
                >
                  {liste.slice(0, vedette ? 5 : 3).map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3">
                      <span>{p.nom}</span>
                      <span
                        aria-hidden
                        className={cn(
                          "mx-1 min-w-4 flex-1 -translate-y-1 border-b border-dotted",
                          vedette ? "border-porcelain/30" : "border-ink/20",
                        )}
                      />
                      <span className={vedette ? "text-porcelain" : "text-ink"}>
                        {prixAffiche(p)} · {formatDuree(p.duree_minutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* 3. RÉALISATIONS */}
      <Section
        eyebrow="Réalisations"
        title="Les dernières poses"
        action={
          <Link to="/galerie" className="btn-secondaire !py-3">
            Toute la galerie <ArrowUpRight className="size-4" strokeWidth={1.6} />
          </Link>
        }
      >
        <div data-apparait>
          <GaleriePhotos photos={realisations} />
        </div>
      </Section>

      {/* 4. SAVOIR-FAIRE */}
      <Section eyebrow="Savoir-faire" title="Un travail soigné, à chaque étape">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {SAVOIR_FAIRE.map((v, i) => (
            <div
              key={v.title}
              data-apparait
              style={{ "--delai": `${i * 90}ms` } as React.CSSProperties}
              className="carte p-7"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-sage-soft text-emerald">
                <v.icon className="size-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-6 font-display text-3xl text-ink">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-taupe">{v.text}</p>
            </div>
          ))}
          <div data-apparait className="fond-aurore rounded-[1.75rem] p-7 md:col-span-3 md:p-9">
            <p className="eyebrow">Le rendez-vous</p>
            <ol className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
              {DEROULEMENT.map((step) => (
                <li key={step.n}>
                  <p className="font-display text-5xl text-emerald/40">{step.n}</p>
                  <h3 className="mt-2 font-display text-2xl text-ink">{step.t}</h3>
                  <p className="mt-1 text-sm text-taupe">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* 5. AVIS (Planity) */}
      <Section
        eyebrow="Avis"
        title="Ce qu'elles en disent"
        description={`Avis laissés par des clientes sur ${reviewsSummary.source}.`}
      >
        <div className="defile-x -mx-4 gap-3 px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4">
          {testimonials.slice(0, 4).map((t, i) => (
            <blockquote
              key={t.id}
              data-apparait
              style={{ "--delai": `${i * 80}ms` } as React.CSSProperties}
              className={cn(
                "flex w-[80%] shrink-0 flex-col justify-between rounded-[1.75rem] p-6 md:w-auto",
                i === 0 ? "fond-emeraude" : "carte",
              )}
            >
              <div>
                <Quote
                  className={cn("size-6", i === 0 ? "text-gold" : "text-sage")}
                  strokeWidth={1.4}
                />
                <p
                  className={cn(
                    "mt-4 font-display text-2xl leading-snug",
                    i === 0 ? "text-porcelain" : "text-ink",
                  )}
                >
                  « {t.text} »
                </p>
              </div>
              <footer
                className={cn(
                  "mt-6 flex items-center justify-between text-xs",
                  i === 0 ? "text-porcelain/70" : "text-taupe",
                )}
              >
                <span>
                  {t.firstName} · {t.service}
                </span>
                <span className="flex gap-0.5" aria-label={`${t.rating} étoiles sur 5`}>
                  {Array.from({ length: t.rating }, (_, k) => (
                    <Star key={k} className="size-3.5 fill-gold text-gold" strokeWidth={1} />
                  ))}
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </Section>

      {/* 6. PRISE DE RENDEZ-VOUS */}
      <section className="px-3 pb-16 pt-6 sm:px-5 sm:pb-24">
        <div
          data-apparait
          className="fond-emeraude relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] px-6 py-14 sm:px-14 sm:py-20"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-sage/25 blur-3xl" />
          <p className="eyebrow !text-porcelain/70">Réservation</p>
          <h2 className="mt-4 max-w-2xl font-display text-5xl leading-[0.95] text-porcelain sm:text-7xl">
            Prête pour <em className="texte-or not-italic">vos prochains ongles</em> ?
          </h2>
          <p className="mt-5 max-w-lg text-porcelain/80">
            Choisissez une ou plusieurs prestations et votre créneau en quelques minutes. Acompte de{" "}
            {POURCENT_ACOMPTE} % réglé en ligne pour valider le rendez-vous.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/reserver"
              className="btn-primaire !bg-none !bg-porcelain !text-emerald-deep hover:!bg-linen"
            >
              <CalendarHeart className="size-[18px]" strokeWidth={1.6} />
              Prendre rendez-vous
            </Link>
            <a
              href={`tel:${business.phone}`}
              className="btn-secondaire !border-porcelain/25 !bg-porcelain/10 !text-porcelain hover:!bg-porcelain/20"
            >
              <Phone className="size-4" strokeWidth={1.6} />
              {business.phoneDisplay}
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-2 border-t border-porcelain/15 pt-6">
            <span className="mr-1 self-center text-xs text-porcelain/60">
              Clientes de l'agglomération paloise :
            </span>
            {areas.map((a) => (
              <Link
                key={a.slug}
                to="/onglerie/$ville"
                params={{ ville: a.slug }}
                className="rounded-full border border-porcelain/20 px-3.5 py-1.5 text-xs text-porcelain/85 transition-colors hover:bg-porcelain/10"
              >
                {a.city}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
