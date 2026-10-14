// ============================================================
// Paiement intégré à la page (Stripe Payment Element + Express Checkout :
// carte bancaire, Apple Pay, Google Pay), avec le choix de la cliente :
// acompte (30 %, par défaut) ou totalité. Le montant est recalculé par le
// serveur ; la page n'envoie que l'option choisie.
// Aucune clé secrète ici : seulement la clé publiable (pk_…) et la clé de
// paiement de CE rendez-vous, fournies par le serveur.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { business } from "@/config/business";
import { formatEuros } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { choisirOptionPaiement } from "@/lib/reservation.functions";
import {
  DEVIS_TEXTE,
  libelleOption,
  montantAPayer,
  optionsPaiement,
  type ModePaiement,
} from "@/lib/options-paiement";

export type InfosPaiement = {
  reservationId: string;
  clientSecret: string;
  clePublique: string;
  /** Total du rendez-vous (hors prestations sur devis), enregistré par le serveur. */
  prix: number;
  mode: ModePaiement;
  expireLe: string | null;
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
  onMode,
  avecDevis = false,
}: {
  infos: InfosPaiement;
  /** Adresse de retour si la banque demande une vérification sur une autre page (3-D Secure). */
  retourUrl: string;
  /** Appelé une fois le paiement accepté par Stripe, avec l'option payée. */
  onPaye: (mode: ModePaiement) => Promise<void> | void;
  /** Appelé quand la cliente change d'option (récapitulatif de la page). */
  onMode?: (mode: ModePaiement) => void;
  /** La réservation contient une prestation sur devis. */
  avecDevis?: boolean;
}) {
  const stripe = useMemo(() => stripeDe(infos.clePublique), [infos.clePublique]);
  const changerOption = useServerFn(choisirOptionPaiement);
  const [mode, setMode] = useState<ModePaiement>(infos.mode);
  const [clientSecret, setClientSecret] = useState(infos.clientSecret);
  // Change à chaque nouvelle option : le module Stripe est rechargé au bon montant.
  const [version, setVersion] = useState(0);
  const [changement, setChangement] = useState<ModePaiement | null>(null);
  const [paiementEnCours, setPaiementEnCours] = useState(false);
  const options = optionsPaiement(infos.prix);

  const choisir = async (nouveau: ModePaiement) => {
    if (nouveau === mode || changement || paiementEnCours) return;
    setChangement(nouveau);
    try {
      const res = await changerOption({ data: { id: infos.reservationId, mode: nouveau } });
      setMode(res.mode);
      setClientSecret(res.clientSecret);
      setVersion((v) => v + 1);
      onMode?.(res.mode);
    } catch (e) {
      toast.error((e as Error).message.replace(/^Error:\s*/, "") || "Changement impossible.");
    } finally {
      setChangement(null);
    }
  };

  return (
    <div className="space-y-5">
      {options.choixPossible && (
        <fieldset className="space-y-2.5" disabled={!!changement || paiementEnCours}>
          <legend className="mb-2 text-sm font-medium text-ink">Que souhaitez-vous payer ?</legend>
          {(["acompte", "total"] as const).map((m) => {
            const l = libelleOption(infos.prix, m);
            const actif = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => choisir(m)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                  actif
                    ? "border-emerald bg-sage-soft/60 ring-2 ring-emerald/30"
                    : "border-border bg-card hover:border-emerald/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border",
                    actif ? "border-emerald bg-emerald text-porcelain" : "border-taupe/50",
                  )}
                >
                  {changement === m ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    actif && <Check className="size-3" strokeWidth={3} />
                  )}
                </span>
                <span>
                  <span className="block font-semibold text-ink">{l.titre}</span>
                  <span className="block text-sm text-taupe">{l.detail}</span>
                </span>
              </button>
            );
          })}
        </fieldset>
      )}
      {avecDevis && <p className="text-sm text-ink">{DEVIS_TEXTE}</p>}

      <Elements
        key={version}
        stripe={stripe}
        options={{ clientSecret, appearance: APPARENCE, locale: "fr" }}
      >
        <FormulairePaiement
          montant={montantAPayer(infos.prix, mode)}
          mode={mode}
          expireLe={infos.expireLe}
          retourUrl={retourUrl}
          bloque={!!changement}
          onEnvoi={setPaiementEnCours}
          onPaye={() => onPaye(mode)}
        />
      </Elements>
    </div>
  );
}

function FormulairePaiement({
  montant,
  mode,
  expireLe,
  retourUrl,
  bloque,
  onEnvoi,
  onPaye,
}: {
  montant: number;
  mode: ModePaiement;
  expireLe: string | null;
  retourUrl: string;
  bloque: boolean;
  onEnvoi: (enCours: boolean) => void;
  onPaye: () => Promise<void> | void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pret, setPret] = useState(false);
  const [express, setExpress] = useState(false);
  const reste = useCompteARebours(expireLe);
  const expire = reste === 0;

  /** `echecPortefeuille` : referme proprement la fenêtre Apple Pay / Google Pay en cas d'échec. */
  const payer = async (echecPortefeuille?: (p?: { reason?: "fail" }) => void) => {
    if (!stripe || !elements || expire || bloque) return;
    setEnvoi(true);
    onEnvoi(true);
    setErreur(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: retourUrl },
      // Reste sur la page sauf si la banque exige une vérification ailleurs.
      redirect: "if_required",
    });
    if (error) {
      echecPortefeuille?.({ reason: "fail" });
      setErreur(
        error.type === "card_error" || error.type === "validation_error"
          ? (error.message ?? "Paiement refusé.")
          : "Le paiement n'a pas pu aboutir. Merci de réessayer.",
      );
      setEnvoi(false);
      onEnvoi(false);
      return;
    }
    if (paymentIntent && ["succeeded", "processing"].includes(paymentIntent.status)) {
      await onPaye();
    }
    setEnvoi(false);
    onEnvoi(false);
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
      {/* Invisible (mais chargé) tant que Stripe n'a pas dit quels boutons l'appareil propose */}
      <div
        className={express ? "space-y-3" : "pointer-events-none invisible h-0 overflow-hidden"}
        aria-hidden={!express}
      >
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            buttonType: { applePay: "plain", googlePay: "pay" },
            paymentMethods: { applePay: "always", googlePay: "always", link: "never" },
          }}
          onReady={({ availablePaymentMethods }) => setExpress(!!availablePaymentMethods)}
          onConfirm={(event) => payer(event.paymentFailed)}
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
          // Apple Pay / Google Pay sont déjà proposés en haut : pas de doublon ici.
          wallets: { applePay: "never", googlePay: "never", link: "never" },
        }}
      />

      {erreur && (
        <p role="alert" className="text-sm text-bordeaux">
          {erreur}
        </p>
      )}

      <button
        type="button"
        onClick={() => payer()}
        disabled={!stripe || !pret || envoi || expire || bloque}
        className="btn-primaire w-full"
      >
        {envoi ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {envoi
          ? "Paiement en cours…"
          : mode === "total"
            ? `Payer la totalité : ${formatEuros(montant)}`
            : `Payer l'acompte de ${formatEuros(montant)}`}
      </button>

      <p className="flex items-center justify-center gap-2 text-xs text-taupe">
        <ShieldCheck className="size-4 text-emerald" strokeWidth={1.6} />
        Paiement sécurisé par Stripe · {business.name} ne voit jamais vos coordonnées bancaires
      </p>
    </div>
  );
}
