// ============================================================
// Adresse du site utilisée dans les liens (e-mails, retour du paiement Stripe).
// 1. Secret SITE_URL dans Lovable Cloud, s'il est rempli (nom de domaine).
// 2. Sinon, l'adresse par laquelle le site est consulté, UNIQUEMENT si c'est
//    une adresse connue du site (jamais une adresse inventée par un visiteur).
// 3. Sinon, l'adresse publiée du site (src/config/business.ts).
// ============================================================
import { getRequest } from "@tanstack/react-start/server";
import { business } from "@/config/business";

const ID_PROJET_LOVABLE = "9064e12b-d636-4376-b909-5b8dbe7455ed";

function hoteConnu(hote: string) {
  const officiel = new URL(business.siteUrl).hostname;
  return (
    hote === officiel ||
    hote === "localhost" ||
    hote === "127.0.0.1" ||
    // Aperçus Lovable de ce projet uniquement
    (hote.endsWith(".lovable.app") && hote.includes(ID_PROJET_LOVABLE))
  );
}

export function adresseSite() {
  const configuree = process.env["SITE_URL"];
  if (configuree) return configuree.replace(/\/$/, "");
  try {
    const url = new URL(getRequest().url);
    if (hoteConnu(url.hostname)) {
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      return `${local ? url.protocol : "https:"}//${url.host}`;
    }
  } catch {
    // pas de requête en cours
  }
  return business.siteUrl.replace(/\/$/, "");
}
