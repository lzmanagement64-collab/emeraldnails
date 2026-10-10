// ============================================================
// Envoi des e-mails via Resend (serveur uniquement).
// Secrets dans Lovable Cloud :
//   RESEND_API_KEY  clé d'accès Resend (re_…) — obligatoire pour envoyer
//   RESEND_FROM     expéditeur, ex. « Emerald Beauty <rendezvous@mon-domaine.fr> »
//                   (adresse d'un domaine vérifié dans Resend)
//   SITE_URL        facultatif : adresse du site utilisée dans les liens
//                   (sinon, l'adresse par laquelle le site a été consulté)
// Tant que RESEND_API_KEY n'est pas configurée, les envois sont
// simplement journalisés : la réservation fonctionne quand même.
// ============================================================
import { getRequest } from "@tanstack/react-start/server";
import { business } from "@/config/business";
import { acompteFormate, POURCENT_ACOMPTE } from "./acompte";
import { DELAI_ANNULATION_H } from "./annulation";
import { parisLongDate, parisTime, formatEuros, formatDuree } from "./tz";

type Envoi = { to: string; subject: string; html: string };

/** Adresse du site pour les liens des e-mails (annulation, back-office). */
function siteUrl() {
  const configuree = process.env["SITE_URL"];
  if (configuree) return configuree.replace(/\/$/, "");
  try {
    // Requête en cours (réservation, webhook Stripe, rappel…) : vraie adresse du site.
    const url = new URL(getRequest().url);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return `${local ? url.protocol : "https:"}//${url.host}`;
  } catch {
    return business.siteUrl.replace(/\/$/, "");
  }
}

/** Envoie un e-mail et renvoie la raison précise en cas d'échec. */
export async function envoyer({
  to,
  subject,
  html,
}: Envoi): Promise<{ ok: boolean; erreur?: string }> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM"] || `${business.name} <onboarding@resend.dev>`;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY absente — email non envoyé à ${to} (${subject})`);
    return {
      ok: false,
      erreur: "Le secret RESEND_API_KEY n'est pas configuré dans Lovable Cloud.",
    };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      // Les réponses des clientes arrivent sur l'adresse de contact publique.
      body: JSON.stringify({ from, to: [to], subject, html, reply_to: business.email }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[email] échec Resend [${res.status}]: ${detail}`);
      return {
        ok: false,
        erreur: `Resend a refusé l'envoi (${res.status}) : ${detail.slice(0, 300)}`,
      };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] Resend injoignable", e);
    return { ok: false, erreur: "Resend est injoignable pour le moment." };
  }
}

export async function envoyerEmail(envoi: Envoi): Promise<boolean> {
  return (await envoyer(envoi)).ok;
}

// ------------------------------------------------------------
// Gabarits — identité visuelle du site
// ------------------------------------------------------------
const VERT = "#0f4a2f";
const CREME = "#faf7f2";
const ENCRE = "#1d1c1a";
const TAUPE = "#6f6a63";

function gabarit(titre: string, corps: string, cta?: { url: string; label: string }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background-color:#ffffff;font-family:Georgia,'Times New Roman',serif;color:${ENCRE};">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${VERT};">${business.name}</p>
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:normal;color:${ENCRE};">${titre}</h1>
    ${corps}
    ${
      cta
        ? `<p style="margin:28px 0;"><a href="${cta.url}" style="display:inline-block;background-color:${VERT};color:#ffffff;text-decoration:none;padding:14px 26px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;border-radius:2px;">${cta.label}</a></p>`
        : ""
    }
    <hr style="border:none;border-top:1px solid #e8e2d9;margin:28px 0;" />
    <p style="margin:0;font-size:13px;color:${TAUPE};line-height:1.7;">
      ${business.name} — ${business.address}<br />
      ${business.phoneDisplay} · ${business.email}
    </p>
  </div></body></html>`;
}

export type ReservationEmail = {
  id: string;
  prestation: string;
  dureeMinutes: number;
  prix: number;
  dateDebut: string;
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  commentaire?: string | null;
  tokenAnnulation: string;
  acompteMontant?: number | null;
  acompteStatut?: string;
};

/** Ligne « acompte » du récapitulatif, selon l'état du paiement. */
function ligneAcompte(r: ReservationEmail) {
  if (r.acompteStatut === "paye" && r.acompteMontant != null) {
    const reste = Math.max(0, Math.round((r.prix - r.acompteMontant) * 100) / 100);
    return `Acompte réglé : ${formatEuros(r.acompteMontant)} · Reste à régler sur place : ${formatEuros(reste)}`;
  }
  if (r.acompteStatut === "rembourse" && r.acompteMontant != null) {
    return `Acompte de ${formatEuros(r.acompteMontant)} remboursé`;
  }
  return `Acompte pour valider le rendez-vous : ${acompteFormate(r.prix)} (${POURCENT_ACOMPTE} %)`;
}

function recap(r: ReservationEmail) {
  return `<table style="width:100%;border-collapse:collapse;background-color:${CREME};border-radius:4px;">
    <tr><td style="padding:16px 18px 6px;font-size:15px;color:${ENCRE};"><strong>${r.prestation}</strong></td></tr>
    <tr><td style="padding:0 18px 4px;font-size:14px;color:${TAUPE};">${parisLongDate(r.dateDebut)} à ${parisTime(r.dateDebut)}</td></tr>
    <tr><td style="padding:0 18px 4px;font-size:14px;color:${TAUPE};">Durée : ${formatDuree(r.dureeMinutes)} · Tarif : ${formatEuros(r.prix)}</td></tr>
    <tr><td style="padding:0 18px 4px;font-size:14px;color:${TAUPE};">${ligneAcompte(r)}</td></tr>
    <tr><td style="padding:0 18px 16px;font-size:14px;color:${TAUPE};">${business.address}</td></tr>
  </table>`;
}

const lienAnnulation = (r: ReservationEmail) =>
  `${siteUrl()}/annulation?token=${r.tokenAnnulation}`;

const phraseAnnulation = (r: ReservationEmail) =>
  `<p style="font-size:14px;line-height:1.7;color:${TAUPE};">Un empêchement ? L'annulation est gratuite jusqu'à ${DELAI_ANNULATION_H} h avant le rendez-vous, et l'acompte est alors remboursé : <a href="${lienAnnulation(r)}" style="color:${VERT};">annuler votre rendez-vous ici</a>. À moins de ${DELAI_ANNULATION_H} h, ou en cas d'absence, l'acompte est conservé ; merci de nous appeler au ${business.phoneDisplay}.</p>`;

export async function emailDemandeCliente(r: ReservationEmail) {
  return envoyerEmail({
    to: r.email,
    subject: "Votre demande de rendez-vous",
    html: gabarit(
      `Bonjour ${r.prenom}, votre demande est bien reçue`,
      `<p style="font-size:15px;line-height:1.8;">Merci pour votre confiance. Voici le récapitulatif de votre demande :</p>
       ${recap(r)}
       <p style="font-size:15px;line-height:1.8;">Maria vous confirmera votre rendez-vous. Ce créneau vous est réservé en attendant. Un acompte de ${POURCENT_ACOMPTE} % est demandé pour valider le rendez-vous.</p>
       ${phraseAnnulation(r)}`,
    ),
  });
}

export async function emailConfirmationCliente(r: ReservationEmail) {
  return envoyerEmail({
    to: r.email,
    subject: "Rendez-vous confirmé",
    html: gabarit(
      `C'est confirmé, ${r.prenom} !`,
      `<p style="font-size:15px;line-height:1.8;">Votre rendez-vous est validé. Nous avons hâte de vous accueillir.</p>
       ${recap(r)}
       <p style="font-size:15px;line-height:1.8;">Pensez à retirer tout vernis et à venir les mains propres, sans crème.</p>
       ${phraseAnnulation(r)}`,
    ),
  });
}

export async function emailRappelCliente(r: ReservationEmail) {
  return envoyerEmail({
    to: r.email,
    subject: "Rappel : votre rendez-vous demain",
    html: gabarit(
      `À demain, ${r.prenom}`,
      `<p style="font-size:15px;line-height:1.8;">Petit rappel de votre rendez-vous :</p>
       ${recap(r)}
       <p style="font-size:14px;line-height:1.7;color:${TAUPE};">Un empêchement ? Votre rendez-vous a lieu dans moins de ${DELAI_ANNULATION_H} h : merci de nous prévenir par téléphone au ${business.phoneDisplay}.</p>`,
    ),
  });
}

export async function emailNouvelleDemandeGerante(r: ReservationEmail) {
  return envoyerEmail({
    to: business.ownerEmail,
    subject: `${r.acompteStatut === "paye" ? "Nouveau rendez-vous, acompte payé" : "Nouvelle demande de rendez-vous"} — ${r.prenom} ${r.nom}`,
    html: gabarit(
      r.acompteStatut === "paye"
        ? "Nouveau rendez-vous (acompte payé)"
        : "Nouvelle demande de rendez-vous",
      `${recap(r)}
       <p style="font-size:14px;line-height:1.8;">
         <strong>${r.prenom} ${r.nom}</strong><br />
         ${r.telephone}<br />
         ${r.email}
       </p>
       ${r.commentaire ? `<p style="font-size:14px;line-height:1.8;color:${TAUPE};">« ${r.commentaire} »</p>` : ""}`,
      { url: `${siteUrl()}/admin`, label: "Ouvrir le back-office" },
    ),
  });
}

export async function emailAnnulationGerante(r: ReservationEmail) {
  return envoyerEmail({
    to: business.ownerEmail,
    subject: `Annulation — ${r.prenom} ${r.nom}`,
    html: gabarit(
      "Un créneau vient d'être libéré",
      `<p style="font-size:15px;line-height:1.8;">${r.prenom} ${r.nom} a annulé son rendez-vous.</p>
       ${recap(r)}
       <p style="font-size:14px;line-height:1.8;">${r.telephone} · ${r.email}</p>`,
      { url: `${siteUrl()}/admin`, label: "Voir le planning" },
    ),
  });
}

/** Alerte à la gérante quand une action manuelle est nécessaire (ex. remboursement). */
export async function emailAlerteGerante(r: ReservationEmail, message: string) {
  return envoyerEmail({
    to: business.ownerEmail,
    subject: `Action requise — ${r.prenom} ${r.nom}`,
    html: gabarit(
      "Action requise",
      `<p style="font-size:15px;line-height:1.8;">${message}</p>
       ${recap(r)}
       <p style="font-size:14px;line-height:1.8;">${r.telephone} · ${r.email}</p>`,
      { url: `${siteUrl()}/admin`, label: "Ouvrir le back-office" },
    ),
  });
}

/** E-mail de test envoyé depuis l'admin pour vérifier la configuration. */
export async function emailTestGerante() {
  const from = process.env["RESEND_FROM"] || `${business.name} <onboarding@resend.dev>`;
  const res = await envoyer({
    to: business.ownerEmail,
    subject: `E-mail de test — ${business.name}`,
    html: gabarit(
      "L'envoi d'e-mails fonctionne",
      `<p style="font-size:15px;line-height:1.8;">Si vous lisez ce message, les e-mails du site partent correctement.</p>
       <p style="font-size:14px;line-height:1.8;color:${TAUPE};">Expéditeur utilisé : ${from.replace(/</g, "&lt;")}<br />Liens du site : ${siteUrl()}</p>`,
      { url: `${siteUrl()}/admin`, label: "Ouvrir le back-office" },
    ),
  });
  return { ...res, destinataire: business.ownerEmail, expediteur: from };
}
