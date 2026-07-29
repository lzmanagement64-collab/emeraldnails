import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

import { Section } from "@/components/site/Section";
import { PaymentTestModeBanner } from "@/components/site/PaymentTestModeBanner";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createDepositCheckout, getDepositStatus } from "@/lib/payments.functions";
import { business } from "@/config/business";

const searchSchema = z.object({
  booking: z.string().uuid().optional(),
});

export const Route = createFileRoute("/paiement")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Paiement sécurisé de l'acompte — Emerald Beauty" },
      {
        name: "description",
        content:
          "Réglez l'acompte de 20 % de votre rendez-vous Emerald Beauty en carte bancaire, Apple Pay ou PayPal. Paiement chiffré, aucune donnée bancaire stockée par le studio.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Paiement sécurisé — Emerald Beauty" },
      {
        property: "og:description",
        content: "Acompte de 20 % en carte bancaire, Apple Pay ou PayPal — paiement chiffré.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentPage,
});

type Summary = Awaited<ReturnType<typeof getDepositStatus>>;

function PaymentPage() {
  const { booking } = Route.useSearch();
  const [summary, setSummary] = useState<Summary>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!booking) {
      setLoading(false);
      return;
    }
    getDepositStatus({ data: { bookingId: booking } })
      .then((res) => {
        if (!active) return;
        setSummary(res);
        if (!res) setError("Réservation introuvable.");
      })
      .catch(() => active && setError("Impossible de charger votre réservation."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [booking]);

  const options = useMemo(() => {
    if (!booking) return null;
    return {
      fetchClientSecret: async () => {
        const result = await createDepositCheckout({
          data: {
            bookingId: booking,
            returnUrl: `${window.location.origin}/confirmation?booking=${booking}&session_id={CHECKOUT_SESSION_ID}`,
            environment: getStripeEnvironment(),
          },
        });
        if ("error" in result) throw new Error(result.error);
        return result.clientSecret;
      },
    };
  }, [booking]);

  return (
    <>
      <PaymentTestModeBanner />
      <Section
        eyebrow="Étape finale"
        title="Paiement sécurisé de l'acompte"
        description="Carte bancaire, Apple Pay, Google Pay ou PayPal. Le paiement est traité sur une page chiffrée de notre prestataire bancaire : le studio ne voit ni ne conserve vos coordonnées bancaires."
        as="h1"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="order-2 min-h-[420px] rounded-sm border border-border bg-card p-4 sm:p-6 lg:order-1">
            {loading && (
              <div className="grid h-64 place-items-center text-taupe">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}

            {!loading && !booking && (
              <div className="space-y-3 text-sm text-taupe">
                <p className="font-display text-xl text-ink">Aucune réservation à régler</p>
                <p>Commencez par choisir votre prestation et votre créneau.</p>
                <Link to="/reservation" className="inline-block underline underline-offset-4">
                  Prendre rendez-vous
                </Link>
              </div>
            )}

            {!loading && error && <p className="text-sm text-bordeaux">{error}</p>}

            {!loading && summary?.depositStatus === "paid" && (
              <div className="space-y-2 text-sm text-taupe">
                <p className="font-display text-xl text-ink">Acompte déjà réglé</p>
                <p>Votre rendez-vous est confirmé. À très vite au studio !</p>
              </div>
            )}

            {!loading && booking && options && summary && summary.depositStatus !== "paid" && (
              <div id="checkout">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </div>

          <aside className="order-1 space-y-4 lg:order-2">
            {summary && (
              <div className="rounded-sm border border-border bg-card p-6">
                <p className="eyebrow mb-4">Votre rendez-vous</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-taupe">Prestation</dt>
                    <dd className="text-ink">{summary.serviceName}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-taupe">Date</dt>
                    <dd className="text-ink">
                      {new Date(`${summary.appointmentDate}T${summary.startTime}`).toLocaleString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-taupe">
                      Acompte à régler
                    </dt>
                    <dd className="font-display text-2xl text-bordeaux">{summary.depositAmount} €</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="space-y-3 rounded-sm border border-border bg-linen/40 p-5 text-sm text-taupe">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink">
                <ShieldCheck className="size-4" /> Sécurité maximale
              </p>
              <ul className="space-y-2">
                <li>Connexion chiffrée TLS et page de paiement certifiée PCI-DSS niveau 1.</li>
                <li>Authentification forte 3D Secure imposée par votre banque.</li>
                <li>Montant recalculé côté serveur : il ne peut pas être modifié depuis le navigateur.</li>
                <li>Aucune donnée de carte n'est transmise, affichée ni stockée par {business.name}.</li>
              </ul>
              <p className="flex items-center gap-2 pt-1 text-xs">
                <Lock className="size-3.5" /> Le solde est réglé sur place le jour du rendez-vous.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
