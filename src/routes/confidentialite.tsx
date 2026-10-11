import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { business, SITE_URL } from "@/config/business";

const titre = "font-display text-2xl text-ink pt-4";

export const Route = createFileRoute("/confidentialite")({
  component: () => (
    <Section eyebrow="Légal" title="Politique de confidentialité" as="h1">
      <div className="mx-auto max-w-3xl space-y-4 leading-relaxed text-taupe">
        <h2 className={titre}>Responsable du traitement</h2>
        <p>
          {business.legal.nomCommercial} ({business.legal.entrepreneuse}), {business.address} —{" "}
          {business.email} — {business.phoneDisplay}.
        </p>

        <h2 className={titre}>Données collectées et utilisation</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">Réservation :</strong> prénom, nom, téléphone, e-mail,
            prestations choisies, date, commentaire éventuel. Utilisées pour gérer votre
            rendez-vous, vous envoyer les e-mails de confirmation et de rappel, et répondre à vos
            demandes (exécution du contrat).
          </li>
          <li>
            <strong className="text-ink">Paiement de l'acompte :</strong> traité directement par
            Stripe. {business.legal.nomCommercial} ne reçoit ni ne conserve votre numéro de carte ;
            seuls le montant et l'état du paiement sont enregistrés (obligations comptables).
          </li>
          <li>
            <strong className="text-ink">Formulaire de contact :</strong> nom, coordonnées et
            message, pour vous répondre.
          </li>
          <li>
            <strong className="text-ink">Sécurité :</strong> des contrôles anti-abus (limitation du
            nombre de demandes) protègent le site (intérêt légitime).
          </li>
        </ul>
        <p>Vos données ne sont jamais revendues ni utilisées à des fins publicitaires.</p>

        <h2 className={titre}>Prestataires techniques</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Lovable (hébergement du site et de la base de données, avec Supabase)</li>
          <li>Stripe (paiement en ligne de l'acompte)</li>
          <li>Resend (envoi des e-mails)</li>
          <li>Google Fonts (affichage des polices de caractères)</li>
        </ul>
        <p>
          Certains de ces prestataires sont situés hors de l'Union européenne (États-Unis). Les
          transferts sont encadrés par les garanties prévues par le RGPD (clauses contractuelles
          types de la Commission européenne ou cadre de protection des données UE–États-Unis).
        </p>

        <h2 className={titre}>Durée de conservation</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Données de rendez-vous : 3 ans après le dernier rendez-vous.</li>
          <li>Pièces comptables (paiements, remboursements) : 10 ans, comme l'exige la loi.</li>
          <li>Messages du formulaire de contact : 1 an.</li>
        </ul>

        <h2 className={titre}>Vos droits</h2>
        <p>
          Vous pouvez demander l'accès, la rectification, l'effacement ou la portabilité de vos
          données, la limitation de leur traitement, ou vous y opposer, en écrivant à{" "}
          <a href={`mailto:${business.email}`} className="text-ink underline underline-offset-4">
            {business.email}
          </a>
          . Réponse sous un mois. Vous pouvez aussi adresser une réclamation à la CNIL (
          <a href="https://www.cnil.fr" className="text-ink underline underline-offset-4">
            cnil.fr
          </a>
          ).
        </p>

        <h2 className={titre}>Cookies</h2>
        <p>
          Le site n'utilise ni cookie publicitaire ni outil de mesure d'audience nécessitant votre
          consentement. Seuls des éléments strictement nécessaires sont utilisés : la connexion à
          l'espace de gestion, et, à l'étape du paiement, les cookies de sécurité de Stripe
          (prévention de la fraude). Ils ne nécessitent pas de consentement préalable.
        </p>
      </div>
    </Section>
  ),
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Emerald Beauty" },
      {
        name: "description",
        content:
          "Données personnelles chez Emerald Beauty : informations collectées, prestataires, durées de conservation, cookies et droits RGPD.",
      },
      { property: "og:url", content: `${SITE_URL}/confidentialite` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/confidentialite` }],
  }),
});
