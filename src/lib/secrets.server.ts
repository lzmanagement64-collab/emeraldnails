// ============================================================
// Lecture des secrets de Lovable Cloud (Cloud → Secrets) côté serveur.
// Jamais de valeur dans le code ni renvoyée au navigateur.
// - Lu au moment de l'utilisation (jamais au chargement du fichier).
// - Tolère une petite erreur de saisie dans le NOM du secret
//   (espace en trop, minuscules) et des espaces/guillemets autour de la valeur.
// - Cherche aussi dans les variables de l'hébergement (Cloudflare) si
//   l'environnement ne les recopie pas dans process.env.
// ============================================================

type Source = Record<string, unknown> | undefined;

function sources(): Source[] {
  const g = globalThis as { __env__?: Source; process?: { env?: Source } };
  return [g.process?.env, g.__env__];
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
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "SITE_URL",
] as const;

export function diagnosticSecrets() {
  return SECRETS_ATTENDUS.map((nom) => ({
    nom,
    present: !!lireSecret(nom),
    nomApproximatif: nomApproximatif(nom),
  }));
}
