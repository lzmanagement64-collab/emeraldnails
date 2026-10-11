import { createFileRoute, Link } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { business, SITE_URL } from "@/config/business";

const titre = "font-display text-2xl text-ink pt-4";

export const Route = createFileRoute("/mentions-legales")({
  component: () => (
    <Section eyebrow="Légal" title="Mentions légales" as="h1">
      <div className="mx-auto max-w-3xl space-y-4 leading-relaxed text-taupe">
        <h2 className={titre}>Éditeur du site</h2>
        <p>
          Le site {SITE_URL.replace("https://", "")} est édité par{" "}
          <strong className="text-ink">{business.legal.nomCommercial}</strong>.
        </p>
        <ul className="space-y-1">
          <li>Entrepreneuse : {business.legal.entrepreneuse}</li>
          <li>Statut juridique : {business.legal.statut}</li>
          <li>SIRET : {business.legal.siretAffiche}</li>
          <li>TVA : {business.legal.tva}</li>
          <li>Adresse : {business.address}</li>
          <li>
            Téléphone :{" "}
            <a href={`tel:${business.phone}`} className="text-ink underline underline-offset-4">
              {business.phoneDisplay}
            </a>
          </li>
          <li>
            E-mail :{" "}
            <a href={`mailto:${business.email}`} className="text-ink underline underline-offset-4">
              {business.email}
            </a>
          </li>
          <li>Directrice de la publication : {business.legal.directricePublication}</li>
        </ul>

        <h2 className={titre}>Hébergement</h2>
        <p>
          Le site est hébergé par {business.hebergeur.nom}, {business.hebergeur.adresse} —{" "}
          <a href={business.hebergeur.site} className="text-ink underline underline-offset-4">
            {business.hebergeur.site.replace("https://", "")}
          </a>
          . Les données de réservation sont stockées dans la base de données du site, fournie par le
          même prestataire (service Lovable Cloud, opéré avec Supabase).
        </p>

        <h2 className={titre}>Propriété intellectuelle</h2>
        <p>
          Les textes, photos de réalisations, logo et éléments graphiques du site sont la propriété
          de {business.legal.nomCommercial}. Toute reproduction, même partielle, sans autorisation
          écrite est interdite.
        </p>

        <h2 className={titre}>Médiation de la consommation</h2>
        <p>
          En cas de litige non résolu à l'amiable, vous pouvez recourir gratuitement au médiateur de
          la consommation : {business.legal.mediateur}.
        </p>

        <h2 className={titre}>Données personnelles</h2>
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link to="/confidentialite" className="text-ink underline underline-offset-4">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </Section>
  ),
  head: () => ({
    meta: [
      { title: "Mentions légales — Emerald Beauty" },
      {
        name: "description",
        content:
          "Mentions légales du site Emerald Beauty, prothésiste ongulaire à Lons : éditeur, SIRET, hébergeur et médiation de la consommation.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/mentions-legales` }],
  }),
});
