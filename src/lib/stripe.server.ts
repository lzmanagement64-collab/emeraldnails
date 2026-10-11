import Stripe from "stripe";
import { lireSecret } from "./secrets.server";
import { requeteDeTest } from "./adresse-site.server";

const getEnv = (key: string): string => {
  const value = lireSecret(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

// ------------------------------------------------------------
// Connexion directe au compte Stripe de l'établissement.
// Secrets à créer dans Lovable Cloud (jamais dans le code) :
//   STRIPE_SECRET_KEY      clé secrète (sk_live_… en réel ; sk_test_… accepté
//                          seulement sur l'aperçu Lovable, jamais sur le site en ligne)
//   STRIPE_WEBHOOK_SECRET  secret de signature du webhook (whsec_…)
// Sans STRIPE_SECRET_KEY, le paiement en ligne est simplement désactivé.
// ------------------------------------------------------------

/**
 * Nature de la clé enregistrée dans STRIPE_SECRET_KEY (jamais la clé elle-même).
 * Clés acceptées : secrète (sk_…) ou restreinte (rk_…), en test ou en réel.
 */
export type EtatCleStripe = "ok" | "absente" | "cle_publique" | "secret_webhook" | "inconnue";

export function analyserCleStripe(cle: string): EtatCleStripe {
  if (!cle) return "absente";
  if (/^(sk|rk)_(test|live)_/.test(cle)) return "ok";
  if (cle.startsWith("pk_")) return "cle_publique";
  if (cle.startsWith("whsec_")) return "secret_webhook";
  return "inconnue";
}

/** Clé publiable (pk_…) : sans danger, nécessaire au module de paiement intégré. */
export function clePublique() {
  const cle = lireSecret("STRIPE_PUBLISHABLE_KEY");
  return cle.startsWith("pk_") ? cle : "";
}

const estCleTest = (cle: string) => /^(sk|rk)_test_/.test(cle);

/**
 * Paiement en ligne actif ? (aucune clé secrète n'est renvoyée)
 * Sur le site en ligne, une clé de TEST est refusée : aucun rendez-vous ne
 * peut alors être pris avec un faux paiement. Appeler `await preparerSecrets()` avant.
 */
export function configPaiement() {
  const key = lireSecret("STRIPE_SECRET_KEY");
  const publique = clePublique();
  const modeTest = estCleTest(key);
  const memeMode = !publique || publique.startsWith("pk_test_") === modeTest;
  const testRefuse = modeTest && !requeteDeTest();
  if (testRefuse) console.error("[paiement] clé Stripe de TEST refusée sur le site en ligne");
  return {
    actif: analyserCleStripe(key) === "ok" && !!publique && memeMode && !testRefuse,
    testRefuse,
  };
}

/** Vrai si l'événement Stripe n'est pas du même mode (test / réel) que la clé du site. */
export function evenementAutreMode(livemode: unknown) {
  if (typeof livemode !== "boolean") return false;
  return livemode === estCleTest(lireSecret("STRIPE_SECRET_KEY"));
}

/** Diagnostic complet pour l'admin : format des secrets et connexion réelle à Stripe. */
export async function diagnosticPaiement() {
  const { preparerSecrets, etatRelaisSecrets } = await import("./secrets.server");
  await preparerSecrets();
  const cle = lireSecret("STRIPE_SECRET_KEY");
  const publique = lireSecret("STRIPE_PUBLISHABLE_KEY");
  const etatCle = analyserCleStripe(cle);
  const webhook = lireSecret("STRIPE_WEBHOOK_SECRET");
  let connexion: { ok: boolean; erreur?: string } | null = null;
  if (etatCle === "ok") {
    try {
      await getStripe().checkout.sessions.list({ limit: 1 });
      connexion = { ok: true };
    } catch (e) {
      connexion = { ok: false, erreur: getStripeErrorMessage(e) };
    }
  }
  return {
    etatCle,
    modeTest: estCleTest(cle),
    testRefuse: estCleTest(cle) && !requeteDeTest(),
    webhook: !webhook ? "absent" : webhook.startsWith("whsec_") ? "ok" : "format_inconnu",
    clePublique: !publique ? "absente" : publique.startsWith("pk_") ? "ok" : "format_inconnu",
    memeMode:
      !publique || etatCle !== "ok"
        ? true
        : /^pk_test_/.test(publique) === /^(sk|rk)_test_/.test(cle),
    connexion,
    relais: etatRelaisSecrets(),
  };
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(getEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-03-25.dahlia",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return client;
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }

  return "Stripe request failed";
}

export type StripeWebhookObject = {
  metadata?: Record<string, string> | null;
  [key: string]: unknown;
};

export async function verifyWebhook(req: Request): Promise<{
  id: string;
  type: string;
  livemode?: boolean;
  data: { object: StripeWebhookObject };
}> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = getEnv("STRIPE_WEBHOOK_SECRET");

  if (!signature || !body) {
    throw new Error("Missing signature or body");
  }

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }

  if (!timestamp || v1Signatures.length === 0) {
    throw new Error("Invalid signature format");
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) {
    throw new Error("Webhook timestamp too old");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");

  if (!v1Signatures.includes(expected)) {
    throw new Error("Invalid webhook signature");
  }

  return JSON.parse(body);
}
