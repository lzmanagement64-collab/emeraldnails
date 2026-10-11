// ============================================================
// Adresse du site utilisée dans les liens (e-mails, retour du paiement Stripe).
// 1. Secret SITE_URL dans Lovable Cloud, s'il est rempli.
// 2. Aperçu Lovable de ce projet ou poste local : l'adresse consultée
//    (pour tester sans toucher au vrai site).
// 3. Sinon, toujours l'adresse officielle (src/config/business.ts) —
//    jamais une adresse inventée par un visiteur, ni www ou lovable.app.
// ============================================================
import { getRequest } from "@tanstack/react-start/server";
import { business } from "@/config/business";
import { lireSecret } from "./secrets.server";

const ID_PROJET_LOVABLE = "9064e12b-d636-4376-b909-5b8dbe7455ed";

function hoteDeTest(hote: string) {
  return (
    hote === "localhost" ||
    hote === "127.0.0.1" ||
    // Aperçus Lovable de ce projet uniquement
    (hote.endsWith(".lovable.app") && hote.includes(ID_PROJET_LOVABLE))
  );
}

/** Vrai sur l'aperçu Lovable de ce projet ou en local (jamais sur le site en ligne). */
export function requeteDeTest() {
  try {
    return hoteDeTest(new URL(getRequest().url).hostname);
  } catch {
    return false;
  }
}

export function adresseSite() {
  const configuree = lireSecret("SITE_URL");
  if (configuree) return configuree.replace(/\/$/, "");
  try {
    const url = new URL(getRequest().url);
    if (hoteDeTest(url.hostname)) {
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      return `${local ? url.protocol : "https:"}//${url.host}`;
    }
  } catch {
    // pas de requête en cours
  }
  return business.siteUrl.replace(/\/$/, "");
}
