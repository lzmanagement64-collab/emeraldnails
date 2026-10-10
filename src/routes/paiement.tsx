import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Check, Loader2, Lock } from "lucide-react";

import { Section } from "@/components/site/Section";
import { business } from "@/config/business";
import { etatAcompte, relancerPaiement } from "@/lib/reservation.functions";
import { formatEuros, parisLongDate, parisTime } from "@/lib/tz";
import { ANNULATION_TEXTE } from "@/lib/annulation";

// Page de retour après la page de paiement Stripe (payé ou abandonné).
const searchSchema = z.object({
  reservation: z.string().uuid().optional(),
  retour: z.enum(["ok", "annule"]).optional(),
});

export const Route = createFileRoute("/paiement")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Paiement de l'acompte — Emerald Beauty" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaiementPage,
});

type Etat = Awaited<ReturnType<typeof etatAcompte>>;

function PaiementPage() {
  const { reservation, retour } = Route.useSearch();
  const lireEtat = useServerFn(etatAcompte);
  const relancer = useServerFn(relancerPaiement);
  const [etat, setEtat] = useState<Etat>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (!reservation) return null;
    const res = await lireEtat({ data: { id: reservation } });
    setEtat(res);
    return res;
  }, [reservation, lireEtat]);

  // Au retour de Stripe, la confirmation du paiement peut prendre quelques secondes.
  useEffect(() => {
    let actif = true;
    let essais = 0;
    const tourner = async () => {
      try {
        const res = await charger();
        essais += 1;
        if (actif && retour === "ok" && res?.acompteStatut === "en_attente" && essais < 20) {
          setTimeout(tourner, 2000);
          return;
        }
      } catch {
        if (actif) setErreur("Impossible de charger votre réservation.");
      }
      if (actif) setChargement(false);
    };
    tourner();
    return () => {
      actif = false;
    };
  }, [charger, retour]);

  const payer = async () => {
    if (!reservation) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const { url } = await relancer({ data: { id: reservation } });
      window.location.assign(url);
    } catch (e) {
      setErreur((e as Error).message.replace(/^Error:\s*/, ""));
      setEnvoi(false);
      await charger().catch(() => undefined);
    }
  };

  const reste = etat && etat.acompte != null ? Math.max(0, etat.prix - etat.acompte) : null;

  return (
    <Section eyebrow="Réservation" title="Acompte de votre rendez-vous" as="h1">
      <div className="mx-auto max-w-xl space-y-6">
        {chargement && (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-taupe">
            <Loader2 className="size-4 animate-spin" />
            {retour === "ok" ? "Confirmation du paiement en cours…" : "Chargement…"}
          </p>
        )}

        {!chargement && !etat && (
          <div className="space-y-3 text-sm text-taupe">
            <p className="font-display text-xl text-ink">Réservation introuvable</p>
            <Link to="/reserver" className="inline-block underline underline-offset-4">
              Prendre rendez-vous
            </Link>
          </div>
        )}

        {!chargement && etat && (
          <>
            <div className="rounded-sm border border-border bg-linen/40 p-5">
              <p className="font-display text-lg text-ink">{etat.prestation}</p>
              <p className="mt-1 text-sm text-taupe">
                {parisLongDate(etat.dateDebut)} à {parisTime(etat.dateDebut)} ·{" "}
                {formatEuros(etat.prix)}
              </p>
              <p className="mt-1 text-sm text-taupe">{business.address}</p>
            </div>

            {etat.acompteStatut === "paye" && (
              <div className="space-y-3 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink/10">
                  <Check className="size-6 text-ink" />
                </div>
                <p className="font-display text-2xl text-ink">Rendez-vous confirmé</p>
                <p className="text-sm text-taupe">
                  Acompte réglé : {formatEuros(etat.acompte ?? 0)}. Reste à régler sur place :{" "}
                  {formatEuros(reste ?? 0)}.
                </p>
                <p className="text-sm text-taupe">{ANNULATION_TEXTE}</p>
              </div>
            )}

            {etat.acompteStatut === "en_attente" && retour === "ok" && (
              <p className="text-center text-sm text-taupe">
                Votre paiement est en cours de confirmation. Vous pouvez actualiser cette page dans
                quelques instants.
              </p>
            )}

            {etat.acompteStatut === "en_attente" &&
              etat.statut !== "annulee" &&
              retour !== "ok" && (
                <div className="space-y-4 text-center">
                  <p className="font-display text-xl text-ink">Acompte non réglé</p>
                  <p className="text-sm text-taupe">
                    Votre créneau est réservé provisoirement
                    {etat.expireLe ? ` jusqu'à ${parisTime(etat.expireLe)}` : ""}. Sans paiement de
                    l'acompte ({formatEuros(etat.acompte ?? 0)}), il sera libéré automatiquement.
                  </p>
                  <button
                    type="button"
                    onClick={payer}
                    disabled={envoi}
                    className="inline-flex items-center gap-2 rounded-sm bg-ink px-7 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain disabled:opacity-60"
                  >
                    <Lock className="size-3.5" />
                    {envoi
                      ? "Ouverture du paiement…"
                      : `Payer l'acompte de ${formatEuros(etat.acompte ?? 0)}`}
                  </button>
                </div>
              )}

            {etat.acompteStatut === "expire" && (
              <div className="space-y-3 text-center">
                <p className="font-display text-xl text-ink">Créneau libéré</p>
                <p className="text-sm text-taupe">
                  L'acompte n'a pas été réglé dans le délai : la réservation n'a pas été validée.
                  Vous pouvez choisir un nouveau créneau.
                </p>
                <Link
                  to="/reserver"
                  className="inline-block rounded-sm bg-ink px-7 py-4 font-mono text-[11px] uppercase tracking-widest text-porcelain"
                >
                  Reprendre un rendez-vous
                </Link>
              </div>
            )}

            {etat.acompteStatut === "rembourse" && (
              <p className="text-center text-sm text-taupe">
                Ce rendez-vous est annulé et l'acompte a été remboursé.
              </p>
            )}

            {etat.acompteStatut === "non_requis" && (
              <p className="text-center text-sm text-taupe">
                Votre demande de rendez-vous est enregistrée. Maria vous contacte pour la confirmer.
              </p>
            )}

            {erreur && <p className="text-center text-sm text-bordeaux">{erreur}</p>}

            <p className="text-center text-sm text-taupe">
              Une question ?{" "}
              <a href={`tel:${business.phone}`} className="underline">
                {business.phoneDisplay}
              </a>
            </p>
          </>
        )}
      </div>
    </Section>
  );
}
