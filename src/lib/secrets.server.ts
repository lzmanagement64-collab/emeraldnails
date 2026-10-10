// ============================================================
// Lecture des secrets de Lovable Cloud (Cloud → Secrets) côté serveur.
// Jamais de valeur dans le code ni renvoyée au navigateur.
// - Lu au moment de l'utilisation (jamais au chargement du fichier).
// - Tolère une petite erreur de saisie dans le NOM du secret
//   (espace en trop, minuscules) et des espaces/guillemets autour de la valeur.
// - Cherche aussi dans les variables de l'hébergement (Cloudflare) si
//   l'environnement ne les recopie pas dans process.env.
// - Si l'hébergement du site ne reçoit pas les secrets de Lovable Cloud,
//   ils sont demandés à la fonction Supabase « secrets-serveur » (qui, elle,
//   les reçoit toujours), avec la clé serveur du projet. Gardés 5 min en
//   mémoire du serveur, jamais envoyés au navigateur.
// ============================================================

type Source = Record<string, unknown> | undefined;

/** Secrets reçus de la fonction Supabase « secrets-serveur » (mémoire du serveur). */
let relais: { valeurs: Record<string, string>; lu: number } | null = null;
const DUREE_RELAIS_MS = 5 * 60_000;

function sourcesSite(): Source[] {
  const g = globalThis as { __env__?: Source; process?: { env?: Source } };
  return [g.process?.env, g.__env__];
}

function sources(): Source[] {
  return [...sourcesSite(), relais?.valeurs];
}

const normaliser = (nom: string) => nom.trim().toUpperCase();

function nettoyer(valeur: unknown): string {
  if (typeof valeur !== "string") return "";
  return valeur
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

/** Valeur d'un secret, ou "" s'il est absent. */
export function lireSecret(nom: string): string {
  const cible = normaliser(nom);
  for (const src of sources()) {
    if (!src) continue;
    // Nom exact d'abord, puis nom saisi avec une petite différence
    const exacte = nettoyer(src[nom]);
    if (exacte) return exacte;
    for (const cle of Object.keys(src)) {
      if (normaliser(cle) === cible) {
        const v = nettoyer(src[cle]);
        if (v) return v;
      }
    }
  }
  return "";
}

/** Le nom du secret a-t-il été saisi avec une différence (espace, minuscules) ? */
function nomApproximatif(nom: string): boolean {
  const cible = normaliser(nom);
  return sources().some(
    (src) => !!src && !(nom in src) && Object.keys(src).some((c) => normaliser(c) === cible),
  );
}

/** Secrets attendus par le site, pour le diagnostic de l'admin (présence seulement). */
export const SECRETS_ATTENDUS = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "SITE_URL",
] as const;

/** Secrets indispensables : s'il en manque un au site, on interroge le relais. */
const ESSENTIELS = [
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

let dernierEchecRelais = "";

/**
 * À appeler (await) avant d'utiliser Stripe ou Resend : complète les secrets
 * manquants depuis la fonction Supabase « secrets-serveur ».
 */
export async function preparerSecrets(): Promise<void> {
  const presentAuSite = (nom: string) => sourcesSite().some((src) => !!src && !!nettoyer(src[nom]));
  if (ESSENTIELS.every(presentAuSite)) return;
  if (relais && Date.now() - relais.lu < DUREE_RELAIS_MS) return;

  const url = lireSecret("SUPABASE_URL");
  const cle = lireSecret("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cle) return;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/functions/v1/secrets-serveur`, {
      method: "POST",
      headers: { "x-cle-serveur": cle, "content-type": "application/json" },
      body: "{}",
    });
    if (!res.ok) {
      dernierEchecRelais = `fonction secrets-serveur : réponse ${res.status}${res.status === 404 ? " (pas encore déployée)" : ""}`;
      // On réessaiera dans une minute plutôt qu'à chaque requête.
      relais = { valeurs: relais?.valeurs ?? {}, lu: Date.now() - DUREE_RELAIS_MS + 60_000 };
      return;
    }
    const corps = (await res.json()) as { secrets?: Record<string, string> };
    relais = { valeurs: corps.secrets ?? {}, lu: Date.now() };
    dernierEchecRelais = "";
  } catch {
    dernierEchecRelais = "fonction secrets-serveur injoignable";
    relais = { valeurs: relais?.valeurs ?? {}, lu: Date.now() - DUREE_RELAIS_MS + 60_000 };
  }
}

export function diagnosticSecrets() {
  return SECRETS_ATTENDUS.map((nom) => {
    const auSite = sourcesSite().some((src) => !!src && !!nettoyer(src[nom]));
    const parRelais = !auSite && !!nettoyer(relais?.valeurs[nom]);
    return {
      nom,
      present: auSite || parRelais,
      source: auSite ? ("site" as const) : parRelais ? ("relais" as const) : null,
      nomApproximatif: nomApproximatif(nom),
    };
  });
}

/** Raison du dernier échec du relais (pour l'admin), ou "". */
export const etatRelaisSecrets = () => dernierEchecRelais;
