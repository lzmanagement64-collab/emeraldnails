import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Section } from "@/components/site/Section";
import { LeadForm } from "@/components/site/LeadForm";
import { business, SITE_URL } from "@/config/business";
import { lignesHoraires } from "@/lib/site-data";

const rootRoute = getRouteApi("__root__");

const TITLE = `Contact — Onglerie à Lons près de Pau | ${business.name}`;
const DESC = `Contactez Emerald Beauty, prothésiste ongulaire à Lons (64140), près de Pau : ${business.phoneDisplay}, adresse, horaires et formulaire de contact.`;

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/contact` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
  }),
});

function ContactPage() {
  const { horaires } = rootRoute.useLoaderData();
  return (
    <>
      <Section
        eyebrow="Contact"
        title="Parlons de vos ongles"
        description={`Une question sur une prestation, un devis nail art ou un événement ? Écrivez-nous, nous revenons vers vous dès que possible.`}
      >
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6 text-sm">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-taupe" />
              <div>
                <p className="text-ink">{business.address}</p>
                <a
                  href={business.googleBusinessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-taupe underline underline-offset-4"
                >
                  Itinéraire Google Maps
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-taupe" />
              <a href={`tel:${business.phone}`} className="text-ink underline underline-offset-4">
                {business.phoneDisplay}
              </a>
            </div>
            <div className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-taupe" />
              <a
                href={`mailto:${business.email}`}
                className="text-ink underline underline-offset-4"
              >
                {business.email}
              </a>
            </div>
            <div className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-taupe" />
              <ul className="space-y-1 text-taupe">
                {lignesHoraires(horaires).map((h) => (
                  <li key={h.day} className="flex justify-between gap-6">
                    <span>{h.day}</span>
                    <span className="text-ink">{h.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-taupe">
              Zone desservie : {business.serviceArea.join(", ")} et l'ensemble de l'agglomération
              paloise (64).
            </p>
          </div>

          <LeadForm
            type="contact"
            submitLabel="Envoyer ma demande"
            messagePlaceholder="Décrivez votre projet : prestation souhaitée, date approximative, inspiration…"
          />
        </div>
      </Section>
    </>
  );
}
