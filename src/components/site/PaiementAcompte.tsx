// ============================================================
// Paiement de l'acompte intégré à la page (Stripe Payment Element +
// Express Checkout : carte bancaire, Apple Pay, Google Pay).
// Aucune clé secrète ici : seulement la clé publiable (pk_…) et la clé de
// paiement de CE rendez-vous, fournies par le serveur.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { business } from "@/config/business";
import { formatEuros } from "@/lib/tz";

export type InfosPaiement = {
  clientSecret: string;
  clePublique: string;
  acompte: number;
  expireLe: string | null;
  modeTest: boolean;
};

// Couleurs et formes du site (émeraude, ivoire, coins arrondis, Manrope).
const APPARENCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#1e6a4c",
    colorBackground: "#fbfaf5",
    colorText: "#13342a",
    colorTextSecondary: "#5b6b62",
    colorDanger: "#a5473f",
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "16px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid rgba(19, 52, 42, 0.14)", boxShadow: "none" },
    ".Input:focus": { border: "1px solid #1e6a4c", boxShadow: "0 0 0 3px rgba(30,106,76,0.15)" },
    ".Tab": { border: "1px solid rgba(19, 52, 42, 0.14)" },
  },
};

// Un seul chargement du script Stripe par clé publiable.
const instances = new Map<string, Promise<Stripe | null>>();
const stripeDe = (cle: string) => {
  if (!instances.has(cle)) instances.set(cle, loadStripe(cle, { locale: "fr" }));
  return instances.get(cle)!;
};

/** Minutes et secondes restantes avant la libération du créneau. */
function useCompteARebours(expireLe: string | null) {
  const [reste, setReste] = useState<number | null>(null);
  useEffect(() => {
    if (!expireLe) return;
    const fin = new Date(expireLe).getTime();
    const tic = () => setReste(Math.max(0, Math.floor((fin - Date.now()) / 1000)));
    tic();
    const t = setInterval(tic, 1000);
    return () => clearInterval(t);
  }, [expireLe]);
  return reste;
}

export function PaiementAcompte({
  infos,
  retourUrl,
  onPaye,
}: {
  infos: InfosPaiement;
  /** Adresse de retour si la banque demande une vérification sur une autre page (3-D Secure). */
  retourUrl: string;
  /** Appelé une fois le paiement accepté par Stripe. */
  onPaye: () => Promise<void> | void;
}) {
  const stripe = useMemo(() => stripeDe(infos.clePublique), [infos.clePublique]);
  return (
    <Elements
      stripe={stripe}
      options={{ clientSecret: infos.clientSecret, appearance: APPARENCE, locale: "fr" }}
    >
      <FormulairePaiement infos={infos} retourUrl={retourUrl} onPaye={onPaye} />
    </Elements>
  );
}

function FormulairePaiement({
  infos,
  retourUrl,
  onPaye,
}: {
  infos: InfosPaiement;
  retourUrl: string;
  onPaye: () => Promise<void> | void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pret, setPret] = useState(false);
  const [express, setExpress] = useState(false);
  const reste = useCompteARebours(infos.expireLe);
  const expire = reste === 0;

  const payer = async () => {
    if (!stripe || !elements || expire) return;
    setEnvoi(true);
    setErreur(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: retourUrl },
      // Reste sur la page sauf si la banque exige une vérification ailleurs.
      redirect: "if_required",
    });
    if (error) {
      setErreur(
        error.type === "card_error" || error.type === "validation_error"
          ? (error.message ?? "Paiement refusé.")
          : "Le paiement n'a pas pu aboutir. Merci de réessayer.",
      );
      setEnvoi(false);
      return;
    }
    if (paymentIntent && ["succeeded", "processing"].includes(paymentIntent.status)) {
      await onPaye();
    }
    setEnvoi(false);
  };

  return (
    <div className="space-y-5">
      {reste !== null && (
        <p
          className={
            expire
              ? "rounded-2xl bg-bordeaux/10 p-3 text-sm text-bordeaux"
              : "rounded-2xl bg-sage-soft/60 p-3 text-sm text-ink"
          }
          role={expire ? "alert" : undefined}
        >
          {expire
            ? "Le délai de paiement est dépassé : le créneau a été libéré. Merci de refaire une réservation."
            : `Votre créneau est réservé pendant ${Math.floor(reste / 60)} min ${String(reste % 60).padStart(2, "0")} s, le temps du paiement.`}
        </p>
      )}

      {/* Apple Pay / Google Pay (affichés seulement si l'appareil les propose) */}
      <div className={express ? "space-y-3" : "hidden"}>
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            buttonType: { applePay: "plain", googlePay: "pay" },
            paymentMethods: { applePay: "always", googlePay: "always", link: "never" },
          }}
          onReady={({ availablePaymentMethods }) => setExpress(!!availablePaymentMethods)}
          onConfirm={() => payer()}
        />
        <p className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-taupe">
          <span className="h-px flex-1 bg-border" /> ou par carte
          <span className="h-px flex-1 bg-border" />
        </p>
      </div>

      <PaymentElement
        onReady={() => setPret(true)}
        options={{
          layout: "tabs",
          wallets: { applePay: "never", googlePay: "never", link: "never" },
          fields: { billingDetails: { address: "never" } },
        }}
      />

      {erreur && (
        <p role="alert" className="text-sm text-bordeaux">
          {erreur}
        </p>
      )}

      <button
        type="button"
        onClick={payer}
        disabled={!stripe || !pret || envoi || expire}
        className="btn-primaire w-full"
      >
        {envoi ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {envoi ? "Paiement en cours…" : `Payer l'acompte de ${formatEuros(infos.acompte)}`}
      </button>

      <p className="flex items-center justify-center gap-2 text-xs text-taupe">
        <ShieldCheck className="size-4 text-emerald" strokeWidth={1.6} />
        Paiement sécurisé par Stripe · {business.name} ne voit jamais vos coordonnées bancaires
      </p>

      {infos.modeTest && (
        <p className="rounded-2xl border border-border bg-card p-3 text-xs text-taupe">
          Mode test : aucun paiement réel. Carte de test 4242 4242 4242 4242, date future, code 123.
        </p>
      )}
    </div>
  );
}
