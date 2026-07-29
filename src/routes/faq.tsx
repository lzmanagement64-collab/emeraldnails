import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faq } from "@/data/faq";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "Questions fréquentes — Emerald Beauty" },
      { name: "description", content: "Durée d'une pose, préparation, remplissage, annulation, moyens de paiement..." },
      { property: "og:title", content: "Questions fréquentes" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
});

function FaqPage() {
  return (
    <Section eyebrow="FAQ" title="Vos questions, nos réponses">
      <Accordion type="single" collapsible className="mx-auto max-w-3xl">
        {faq.map((f, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border-border">
            <AccordionTrigger className="text-left font-display text-lg text-ink">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-taupe">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
