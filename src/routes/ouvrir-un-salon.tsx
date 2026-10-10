import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { LeadForm } from "@/components/site/LeadForm";
import { business, SITE_URL } from "@/config/business";

const TITLE = "Ouvrir un salon Emerald Beauty — Réseau onglerie Pyrénées-Atlantiques";
const DESC =
  "Projet de réseau Emerald Beauty : vous êtes prothésiste ongulaire et souhaitez ouvrir votre établissement dans le 64 ? Parlons-en.";

export const Route = createFileRoute("/ouvrir-un-salon")({
  component: FranchisePage,
  head: () => ({
    meta: [
      // Page retirée de la navigation : non référencée en attendant une décision.
      { name: "robots", content: "noindex, nofollow" },
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/ouvrir-un-salon` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/ouvrir-un-salon` }],
  }),
});

const PILLARS = [
  {
    title: "Un fonctionnement déjà en place",
    body: "Prestations sur rendez-vous et réservation en ligne : le fonctionnement d'Emerald Beauty à Lons sert de base au projet.",
  },
  {
    title: "Accompagnement",
    body: "Les modalités d'accompagnement (organisation, planning, outils) seront définies avec chaque partenaire.",
  },
  {
    title: "Acquisition digitale incluse",
    body: "Site optimisé SEO local, pages ville dédiées, fiche Google Business, réservation en ligne et suivi des demandes. Vous héritez d'un système d'acquisition, pas seulement d'une enseigne.",
  },
  {
    title: "Un maillage sur tout le 64",
    body: "Objectif : couvrir Pau, Lons, Billère, Jurançon puis Lescar, Bizanos, Oloron et la côte basque. Chaque partenaire dispose d'une zone d'exclusivité pour éviter la cannibalisation.",
  },
];

const STEPS = [
  [
    "01",
    "Prise de contact",
    "Vous remplissez le formulaire ci-dessous. Nous revenons vers vous dès que possible.",
  ],
  [
    "02",
    "Échange & projet",
    "Un entretien pour comprendre votre expérience, votre zone visée et votre capacité d'investissement.",
  ],
  [
    "03",
    "Rencontre à Lons",
    "Un rendez-vous à Lons pour découvrir le fonctionnement d'Emerald Beauty.",
  ],
  ["04", "Ouverture", "Aide au choix du local et au lancement en ligne."],
];

function FranchisePage() {
  return (
    <>
      <Section
        as="h1"
        eyebrow="Expansion"
        title="Ouvrir un salon Emerald Beauty"
        description="Emerald Beauty étudie l'ouverture d'autres établissements dans les Pyrénées-Atlantiques. Vous êtes prothésiste ongulaire et le projet vous intéresse ? Laissez vos coordonnées."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <article key={p.title} className="rounded-sm border border-border bg-card p-6">
              <h2 className="font-display text-xl text-ink">{p.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-taupe">{p.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Parcours" title="Comment ça se passe" className="bg-linen/40">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <li key={n}>
              <p className="font-mono text-[11px] tracking-widest text-gold">{n}</p>
              <p className="mt-2 font-display text-lg text-ink">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-taupe">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Candidature" title="Parlez-nous de votre projet">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4 text-sm leading-relaxed text-taupe">
            <p>
              Que vous soyez déjà prothésiste installée, salariée souhaitant vous mettre à votre
              compte ou investisseuse locale, décrivez-nous votre situation et la ville que vous
              visez.
            </p>
            <p>
              Nous étudions chaque candidature individuellement et privilégions la qualité du geste
              à la vitesse d'ouverture.
            </p>
            <p>
              Vous préférez en parler de vive voix ?{" "}
              <a href={`tel:${business.phone}`} className="text-ink underline underline-offset-4">
                {business.phoneDisplay}
              </a>
            </p>
          </div>
          <LeadForm
            type="franchise"
            submitLabel="Envoyer ma candidature"
            messagePlaceholder="Votre expérience, la ville visée, votre horizon d'ouverture…"
          />
        </div>
      </Section>
    </>
  );
}
