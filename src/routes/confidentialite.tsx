import { SITE_URL } from "@/config/business";
import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";

export const Route = createFileRoute("/confidentialite")({
  component: () => (
    <Section eyebrow="Légal" title="Politique de confidentialité">
      <div className="mx-auto max-w-3xl space-y-4 text-taupe">
        <p className="italic text-bordeaux">
          Contenu provisoire à personnaliser avant mise en ligne.
        </p>
        <p>
          Vos données (nom, prénom, email, téléphone) sont utilisées uniquement pour la gestion des
          rendez-vous et ne sont jamais revendues.
        </p>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression
          de vos données. Contactez-nous pour toute demande.
        </p>
        <h3 className="font-display text-xl text-ink">Cookies</h3>
        <p>
          Ce site utilise uniquement des cookies techniques nécessaires à son fonctionnement. Aucun
          cookie publicitaire n'est déposé.
        </p>
      </div>
    </Section>
  ),
  head: () => ({
    meta: [{ title: "Politique de confidentialité" }],
    links: [{ rel: "canonical", href: `${SITE_URL}/confidentialite` }],
  }),
});
