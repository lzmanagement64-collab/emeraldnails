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
import { adresseSite } from "./adresse-site.server";
import { diagnosticSecrets, lireSecret, preparerSecrets } from "./secrets.server";
import { business } from "@/config/business";
import { acompteFormate, POURCENT_ACOMPTE } from "./acompte";
import { DELAI_ANNULATION_H } from "./annulation";
import { parisLongDate, parisTime, formatEuros, formatDuree } from "./tz";

type Envoi = { to: string; subject: string; html: string };

/** Expéditeur : secret RESEND_FROM, sinon l'adresse de test de Resend. */
const expediteur = () => lireSecret("RESEND_FROM") || `${business.name} <onboarding@resend.dev>`;

/** Adresse par laquelle l'admin a été ouverte (site publié ou aperçu Lovable). */
function adresseConsultee() {
  try {
    return new URL(getRequest().url).host;
  } catch {
    return "";
  }
}

/** Adresse du site pour les liens des e-mails (annulation, back-office). */
const siteUrl = adresseSite;

/** Envoie un e-mail et renvoie la raison précise en cas d'échec. */
export async function envoyer({
  to,
  subject,
  html,
}: Envoi): Promise<{ ok: boolean; erreur?: string }> {
  await preparerSecrets();
  const key = lireSecret("RESEND_API_KEY");
  const from = expediteur();
  if (!key) {
    console.warn(`[email] RESEND_API_KEY absente — email non envoyé à ${to} (${subject})`);
    return {
      ok: false,
      erreur:
        "Le site ne voit pas le secret RESEND_API_KEY. S'il est déjà dans Lovable Cloud → Secrets, republiez le site (Publier → Mettre à jour), puis refaites ce test sur le site publié.",
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

/** Rend un texte saisi par une cliente inoffensif dans un e-mail (pas de balises ni de liens cachés). */
function echapper(texte: string) {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Copie du rendez-vous dont tous les champs saisis sont échappés, pour le contenu HTML. */
function sur(r: ReservationEmail): ReservationEmail {
  return {
    ...r,
    prestation: echapper(r.prestation),
    prenom: echapper(r.prenom),
    nom: echapper(r.nom),
    telephone: echapper(r.telephone),
    email: echapper(r.email),
    commentaire: r.commentaire ? echapper(r.commentaire) : r.commentaire,
  };
}

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
    <tr><td style="padding:0 18px 4px;font-size:14px;color:${TAUPE};">Durée : ${formatDuree(r.dureeMinutes)} · Tarif : ${formatEuros(r.prix)}${r.prestation.includes("(sur devis)") ? " + devis" : ""}</td></tr>
    <tr><td style="padding:0 18px 4px;font-size:14px;color:${TAUPE};">${ligneAcompte(r)}</td></tr>
    <tr><td style="padding:0 18px 16px;font-size:14px;color:${TAUPE};">${business.address}</td></tr>
  </table>`;
}

const lienAnnulation = (r: ReservationEmail) =>
  `${siteUrl()}/annulation?token=${r.tokenAnnulation}`;

const phraseAnnulation = (r: ReservationEmail) =>
  `<p style="font-size:14px;line-height:1.7;color:${TAUPE};">Un empêchement ? L'annulation est gratuite jusqu'à ${DELAI_ANNULATION_H} h avant le rendez-vous, et l'acompte est alors remboursé : <a href="${lienAnnulation(r)}" style="color:${VERT};">annuler votre rendez-vous ici</a>. À moins de ${DELAI_ANNULATION_H} h, ou en cas d'absence, l'acompte est conservé ; merci de nous appeler au ${business.phoneDisplay}.</p>`;

export async function emailDemandeCliente(brut: ReservationEmail) {
  const r = sur(brut);
  return envoyerEmail({
    to: brut.email,
    subject: "Votre demande de rendez-vous",
    html: gabarit(
      `Bonjour ${r.prenom}, votre demande est bien reçue`,
      `<p style="font-size:15px;line-height:1.8;">Merci pour votre confiance. Voici le récapitulatif de votre demande :</p>
       ${recap(r)}
       <p style="font-size:15px;line-height:1.8;">Maria vous confirmera votre rendez-vous. Ce créneau vous est réservé en attendant.${
         brut.acompteMontant && brut.acompteMontant > 0
           ? ` Un acompte de ${POURCENT_ACOMPTE} % est demandé pour valider le rendez-vous.`
           : " Le prix de la prestation sur devis sera fixé avec Maria."
       }</p>
       ${phraseAnnulation(r)}`,
    ),
  });
}

/** Après paiement de l'acompte : demande reçue, en attente de validation par Maria. */
export async function emailAcomptePayeCliente(brut: ReservationEmail) {
  const r = sur(brut);
  return envoyerEmail({
    to: brut.email,
    subject: "Demande reçue, acompte payé",
    html: gabarit(
      `Merci ${r.prenom}, votre acompte est bien payé`,
      `<p style="font-size:15px;line-height:1.8;">Votre demande de rendez-vous est bien reçue et votre acompte est réglé. Votre créneau est réservé.</p>
       ${recap(r)}
       <p style="font-size:15px;line-height:1.8;">Maria va maintenant valider votre rendez-vous : vous recevrez un e-mail de confirmation. Si elle ne pouvait pas vous recevoir, votre acompte vous serait remboursé intégralement.</p>
       ${phraseAnnulation(r)}`,
    ),
  });
}

/** Rendez-vous refusé par Maria : explication et remboursement de l'acompte. */
export async function emailRefusCliente(brut: ReservationEmail, rembourse: boolean) {
  const r = sur(brut);
  const acompte =
    brut.acompteMontant != null && brut.acompteMontant > 0
      ? rembourse
        ? `<p style="font-size:15px;line-height:1.8;">Votre acompte de ${formatEuros(brut.acompteMontant)} vous est remboursé intégralement. Il apparaît en général sous 5 à 10 jours sur votre compte.</p>`
        : `<p style="font-size:15px;line-height:1.8;">Votre acompte de ${formatEuros(brut.acompteMontant)} vous sera remboursé intégralement : Emerald Beauty s'en occupe.</p>`
      : "";
  return envoyerEmail({
    to: brut.email,
    subject: "Votre demande de rendez-vous",
    html: gabarit(
      `Bonjour ${r.prenom}`,
      `<p style="font-size:15px;line-height:1.8;">Nous sommes désolées : Maria ne peut pas vous recevoir sur ce créneau.</p>
       ${recap(r)}
       ${acompte}
       <p style="font-size:15px;line-height:1.8;">N'hésitez pas à choisir un autre créneau sur le site, ou à nous appeler au ${business.phoneDisplay} pour trouver ensemble une autre date.</p>`,
      { url: `${siteUrl()}/reserver`, label: "Choisir un autre créneau" },
    ),
  });
}

/** Confirmation d'une annulation faite par la cliente avec son lien (plus de 72 h avant). */
export async function emailAnnulationCliente(brut: ReservationEmail, message: string) {
  const r = sur(brut);
  return envoyerEmail({
    to: brut.email,
    subject: "Votre rendez-vous est annulé",
    html: gabarit(
      `Bonjour ${r.prenom}`,
      `<p style="font-size:15px;line-height:1.8;">${message.replace(/</g, "&lt;")}</p>
       ${recap(r)}
       <p style="font-size:15px;line-height:1.8;">Au plaisir de vous accueillir une prochaine fois.</p>`,
      { url: `${siteUrl()}/reserver`, label: "Réserver un nouveau créneau" },
    ),
  });
}

export async function emailConfirmationCliente(brut: ReservationEmail) {
  const r = sur(brut);
  return envoyerEmail({
    to: brut.email,
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

export async function emailRappelCliente(brut: ReservationEmail) {
  const r = sur(brut);
  return envoyerEmail({
    to: brut.email,
    subject: "Rappel : votre rendez-vous demain",
    html: gabarit(
      `À demain, ${r.prenom}`,
      `<p style="font-size:15px;line-height:1.8;">Petit rappel de votre rendez-vous :</p>
       ${recap(r)}
       <p style="font-size:14px;line-height:1.7;color:${TAUPE};">Un empêchement ? Votre rendez-vous a lieu dans moins de ${DELAI_ANNULATION_H} h : merci de nous prévenir par téléphone au ${business.phoneDisplay}.</p>`,
    ),
  });
}

export async function emailNouvelleDemandeGerante(brut: ReservationEmail) {
  const r = sur(brut);
  return envoyerEmail({
    to: business.ownerEmail,
    subject: `${brut.acompteStatut === "paye" ? "Acompte payé – à valider" : "Nouvelle demande de rendez-vous"} — ${brut.prenom} ${brut.nom}`,
    html: gabarit(
      r.acompteStatut === "paye"
        ? "Nouvelle demande : acompte payé, à valider"
        : "Nouvelle demande de rendez-vous",
      `${
        r.acompteStatut === "paye"
          ? `<p style="font-size:15px;line-height:1.8;">L'acompte est payé. Ouvrez le back-office pour <strong>valider</strong> le rendez-vous (la cliente reçoit sa confirmation) ou le <strong>refuser</strong> (l'acompte lui est remboursé intégralement).</p>`
          : ""
      }
       ${recap(r)}
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

export async function emailAnnulationGerante(brut: ReservationEmail) {
  const r = sur(brut);
  return envoyerEmail({
    to: business.ownerEmail,
    subject: `Annulation — ${brut.prenom} ${brut.nom}`,
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
export async function emailAlerteGerante(brut: ReservationEmail, message: string) {
  const r = sur(brut);
  return envoyerEmail({
    to: business.ownerEmail,
    subject: `Action requise — ${brut.prenom} ${brut.nom}`,
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
  const from = expediteur();
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
  return {
    ...res,
    destinataire: business.ownerEmail,
    expediteur: from,
    // Ce que le site voit réellement (noms seulement, jamais les valeurs)
    secrets: diagnosticSecrets(),
    adresseConsultee: adresseConsultee(),
  };
}
