import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { business } from "@/config/business";

export const Route = createFileRoute("/conditions")({
  component: () => (
    <Section eyebrow="Légal" title="Conditions de réservation">
      <div className="mx-auto max-w-3xl space-y-4 text-taupe">
        <p className="italic text-bordeaux">Contenu provisoire à personnaliser avant mise en ligne.</p>
        <h3 className="font-display text-xl text-ink">Réservation</h3>
        <p>
          Toute demande de rendez-vous est confirmée par email ou SMS après validation manuelle.
          Un délai minimum de {business.bookingRules.minLeadHours}h est nécessaire.
        </p>
        <h3 className="font-display text-xl text-ink">Annulation</h3>
        <p>
          Une annulation ou modification doit être effectuée au moins 24h avant le rendez-vous.
          Passé ce délai, un dédommagement forfaitaire pourra être demandé.
        </p>
        <h3 className="font-display text-xl text-ink">Retard</h3>
        <p>
          Au-delà de 15 minutes, la prestation pourra être écourtée ou reprogrammée.
        </p>
        <h3 className="font-display text-xl text-ink">Prix</h3>
        <p>
          Les prix affichés sont indicatifs et peuvent varier selon la complexité du nail art
          ou la longueur choisie.
        </p>
      </div>
    </Section>
  ),
  head: () => ({
    meta: [{ title: "Conditions de réservation" }],
    links: [{ rel: "canonical", href: "/conditions" }],
  }),
});
