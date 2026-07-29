import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Lock, Server, CreditCard, EyeOff, FileCheck } from "lucide-react";
import { Section } from "@/components/site/Section";
import { business, SITE_URL } from "@/config/business";

const TITLE = "Sécurité & confidentialité — Emerald Beauty";
const DESC =
  "Comment Emerald Beauty protège vos données : chiffrement HTTPS, hébergement européen, accès restreint, validation serveur des formulaires et paiement d'acompte sécurisé.";

export const Route = createFileRoute("/securite")({
  component: SecurityPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/securite` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/securite` }],
  }),
});

const CONTROLS = [
  {
    icon: Lock,
    title: "Connexion chiffrée de bout en bout",
    body: "L'intégralité du site est servie en HTTPS. Les informations saisies dans le formulaire de réservation ou de contact circulent chiffrées entre votre navigateur et nos serveurs.",
  },
  {
    icon: Server,
    title: "Hébergement et base de données en Europe",
    body: "Vos réservations sont enregistrées dans une base de données managée hébergée dans l'Union européenne, avec sauvegardes automatiques et isolation par projet.",
  },
  {
    icon: EyeOff,
    title: "Aucune lecture publique de vos données",
    body: "La base applique une sécurité au niveau des lignes : aucun visiteur, même techniquement averti, ne peut lister ou consulter les réservations. Seuls les comptes du studio, authentifiés et dotés d'un rôle explicite, y accèdent.",
  },
  {
    icon: FileCheck,
    title: "Validation systématique côté serveur",
    body: "Chaque formulaire est revalidé sur le serveur (format, longueur, cohérence des dates et montants) avant enregistrement. Le navigateur n'écrit jamais directement en base.",
  },
  {
    icon: CreditCard,
    title: "Acompte : aucune donnée bancaire chez nous",
    body: "Le règlement de l'acompte de 20 % passera par un prestataire de paiement certifié PCI-DSS (Stripe). Le numéro de carte est saisi chez le prestataire : Emerald Beauty ne le voit jamais, ne le stocke jamais et ne peut pas y accéder.",
  },
  {
    icon: ShieldCheck,
    title: "Accès du studio protégé",
    body: "L'espace d'administration est derrière une authentification par mot de passe, non indexé par les moteurs de recherche, et limité aux membres autorisés de l'équipe.",
  },
];

function SecurityPage() {
  return (
    <>
      <Section
        as="h1"
        eyebrow="Confiance"
        title="Sécurité & protection de vos données"
        description={`Cette page est rédigée et tenue à jour par ${business.name} pour répondre aux questions les plus fréquentes sur la confidentialité de vos informations. Elle décrit nos pratiques actuelles ; elle ne constitue pas une certification délivrée par un tiers.`}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {CONTROLS.map((c) => (
            <article key={c.title} className="rounded-sm border border-border bg-card p-6">
              <c.icon className="size-5 text-gold" aria-hidden />
              <h2 className="mt-4 font-display text-xl text-ink">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-taupe">{c.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Vos droits" title="Ce que vous pouvez demander" className="bg-linen/40">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 text-sm leading-relaxed text-taupe">
            <p>
              Conformément au RGPD, vous pouvez à tout moment demander l'accès, la rectification,
              la portabilité ou la suppression des données vous concernant, ainsi que vous opposer
              à leur traitement.
            </p>
            <p>
              Les données de réservation sont conservées le temps nécessaire au suivi de la
              relation cliente et aux obligations comptables, puis supprimées.
            </p>
            <p>
              Nous n'utilisons aucun traceur publicitaire et ne revendons aucune donnée à des
              tiers.
            </p>
          </div>
          <div className="rounded-sm border border-border bg-card p-6 text-sm">
            <p className="eyebrow mb-3">Contact données personnelles</p>
            <p className="text-taupe">
              Écrivez à{" "}
              <a href={`mailto:${business.email}`} className="text-ink underline underline-offset-4">
                {business.email}
              </a>{" "}
              ou appelez le{" "}
              <a href={`tel:${business.phone}`} className="text-ink underline underline-offset-4">
                {business.phoneDisplay}
              </a>
              . Réponse sous 30 jours maximum.
            </p>
            <p className="mt-4 text-taupe">
              Faille de sécurité repérée ? Signalez-la à la même adresse, nous traitons ces
              signalements en priorité.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
