// ============================================================
// Envoi des emails via Resend (serveur uniquement).
// Tant que RESEND_API_KEY n'est pas configurée, les envois sont
// simplement journalisés : la réservation fonctionne quand même.
// ============================================================
import { business } from "@/config/business";
import { parisLongDate, parisTime, formatEuros, formatDuree } from "./tz";

type Envoi = { to: string; subject: string; html: string };

function siteUrl() {
  return (process.env["SITE_URL"] || business.siteUrl).replace(/\/$/, "");
}

export async function envoyerEmail({ to, subject, html }: Envoi): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM"] || `${business.name} <onboarding@resend.dev>`;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY absente — email non envoyé à ${to} (${subject})`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html, reply_to: business.email }),
    });
    if (!res.ok) {
      console.error(`[email] échec Resend [${res.status}]: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] Resend injoignable", e);
    return false;
  }
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
};

function recap(r: ReservationEmail) {
  return `<table style="width:100%;border-collapse:collapse;background-color:${CREME};border-radius:4px;">
    <tr><td style="padding:16px 18px 6px;font-size:15px;color:${ENCRE};"><strong>${r.prestation}</strong></td></tr>
    <tr><td style="padding:0 18px 4px;font-size:14px;color:${TAUPE};">${parisLongDate(r.dateDebut)} à ${parisTime(r.dateDebut)}</td></tr>
    <tr><td style="padding:0 18px 4px;font-size:14px;color:${TAUPE};">Durée : ${formatDuree(r.dureeMinutes)} · Tarif : ${formatEuros(r.prix)}</td></tr>
    <tr><td style="padding:0 18px 16px;font-size:14px;color:${TAUPE};">${business.address}</td></tr>
  </table>`;
}

const lienAnnulation = (r: ReservationEmail) => `${siteUrl()}/annulation?token=${r.tokenAnnulation}`;

const phraseAnnulation = (r: ReservationEmail) =>
  `<p style="font-size:14px;line-height:1.7;color:${TAUPE};">Un empêchement ? Vous pouvez <a href="${lienAnnulation(r)}" style="color:${VERT};">annuler votre rendez-vous ici</a>. Merci de prévenir au moins 24 h à l'avance.</p>`;

export async function emailDemandeCliente(r: ReservationEmail) {
  return envoyerEmail({
    to: r.email,
    subject: "Votre demande de rendez-vous",
    html: gabarit(
      `Bonjour ${r.prenom}, votre demande est bien reçue`,
      `<p style="font-size:15px;line-height:1.8;">Merci pour votre confiance. Voici le récapitulatif de votre demande :</p>
       ${recap(r)}
       <p style="font-size:15px;line-height:1.8;">Maria vous adresse la confirmation définitive très rapidement. Ce créneau vous est réservé en attendant.</p>
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
      `<p style="font-size:15px;line-height:1.8;">Votre rendez-vous est validé. Nous avons hâte de vous accueillir à l'atelier.</p>
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
       ${phraseAnnulation(r)}`,
    ),
  });
}

export async function emailNouvelleDemandeGerante(r: ReservationEmail) {
  return envoyerEmail({
    to: business.ownerEmail,
    subject: `Nouvelle demande de rendez-vous — ${r.prenom} ${r.nom}`,
    html: gabarit(
      "Nouvelle demande de rendez-vous",
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
