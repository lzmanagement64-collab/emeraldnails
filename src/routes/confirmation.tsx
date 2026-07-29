import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Check, Instagram } from "lucide-react";
import { Section } from "@/components/site/Section";
import { business } from "@/config/business";

const schema = z.object({
  service: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  name: z.string().optional(),
});

export const Route = createFileRoute("/confirmation")({
  validateSearch: schema,
  component: Confirmation,
  head: () => ({
    meta: [
      { title: "Demande envoyée — Emerald Beauty" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Confirmation() {
  const { service, date, time, name } = Route.useSearch();

  const prettyDate = date
    ? new Date(date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-bordeaux/10 text-bordeaux">
          <Check className="size-6" />
        </div>
        <p className="eyebrow mb-3">Demande enregistrée</p>
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
          Merci{name ? `, ${name}` : ""}.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-taupe">
          Votre demande de rendez-vous a bien été transmise. Vous recevrez une confirmation
          par email dès validation, sous quelques heures. Un acompte de 20 % vous sera demandé
          pour confirmer définitivement le créneau.
        </p>

        {(service || prettyDate || time) && (
          <div className="mx-auto mt-10 rounded-sm border border-border bg-card p-6 text-left">
            <p className="eyebrow mb-4">Votre demande</p>
            <dl className="space-y-3 text-sm">
              {service && (
                <div className="flex justify-between gap-4">
                  <dt className="text-taupe">Prestation</dt>
                  <dd className="text-ink">{service}</dd>
                </div>
              )}
              {prettyDate && (
                <div className="flex justify-between gap-4">
                  <dt className="text-taupe">Date</dt>
                  <dd className="text-ink">{prettyDate}</dd>
                </div>
              )}
              {time && (
                <div className="flex justify-between gap-4">
                  <dt className="text-taupe">Horaire</dt>
                  <dd className="text-ink">{time}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="rounded-sm bg-ink px-7 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain"
          >
            Retour à l'accueil
          </Link>
          <a
            href={business.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-7 py-4 font-mono text-[11px] uppercase tracking-widest text-ink"
          >
            <Instagram className="size-4" /> Nous suivre
          </a>
        </div>
      </div>
    </Section>
  );
}
