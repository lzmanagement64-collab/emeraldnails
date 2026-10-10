import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { business, SITE_URL } from "@/config/business";

export const Route = createFileRoute("/mentions-legales")({
  component: () => (
    <Section eyebrow="Légal" title="Mentions légales">
      <div className="prose prose-stone mx-auto max-w-3xl space-y-4 text-taupe">
        <p className="italic text-bordeaux">
          Contenu provisoire à personnaliser avant mise en ligne.
        </p>
        <h3 className="font-display text-xl text-ink">Éditeur du site</h3>
        <p>
          {business.name} — {business.address}. Téléphone : {business.phoneDisplay}. Email :{" "}
          {business.email}.
        </p>
        <h3 className="font-display text-xl text-ink">Hébergement</h3>
        <p>Site hébergé par Lovable / Cloudflare.</p>
        <h3 className="font-display text-xl text-ink">Propriété intellectuelle</h3>
        <p>L'ensemble des contenus (textes, photos, illustrations) est protégé.</p>
      </div>
    </Section>
  ),
  head: () => ({
    meta: [{ title: "Mentions légales" }, { name: "robots", content: "noindex" }],
    links: [{ rel: "canonical", href: `${SITE_URL}/mentions-legales` }],
  }),
});
