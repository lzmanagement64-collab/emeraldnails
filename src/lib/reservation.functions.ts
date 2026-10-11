// ============================================================
// Fonctions serveur — réservation publique & back-office.
// Le navigateur d'une visiteuse ne lit JAMAIS la table reservations :
// seules des heures de début sortent de la base (fonction Postgres).
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { business } from "@/config/business";
import {
  creneauxSchema,
  moisSchema,
  reservationPubliqueSchema,
  reservationManuelleSchema,
  statutSchema,
  prestationSchema,
  horaireSchema,
  reglagesSchema,
  indisponibiliteSchema,
  idSchema,
  tokenSchema,
} from "./reservation-schemas";

// ------------------------------------------------------------
// PUBLIC
// ------------------------------------------------------------
export const listPrestations = createServerFn({ method: "GET" }).handler(async () => {
  const { supabasePublic } = await import("./reservation.server");
  const { data, error } = await supabasePublic()
    .from("prestations")
    .select(
      "id, nom, description, categorie, duree_minutes, prix, couleur, ordre, sur_devis, en_option",
    )
    .eq("actif", true)
    .order("ordre", { ascending: true });
  if (error) throw new Error("Impossible de charger les prestations.");
  return data ?? [];
});

export const listHoraires = createServerFn({ method: "GET" }).handler(async () => {
  const { supabasePublic } = await import("./reservation.server");
  const { data, error } = await supabasePublic()
    .from("horaires_ouverture")
    .select("jour_semaine, heure_debut, heure_fin, pause_debut, pause_fin, ferme")
    .order("jour_semaine", { ascending: true });
  if (error) throw new Error("Impossible de charger les horaires.");
  return data ?? [];
});

export const getCreneaux = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creneauxSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabasePublic, chargerSelection } = await import("./reservation.server");
    const client = supabasePublic();
    // Créneaux calculés sur la durée totale des prestations choisies.
    const { duree } = await chargerSelection(client, data.prestationIds);
    const { data: rows, error } = await client.rpc("get_creneaux_disponibles_duree", {
      date_recherche: data.date,
      p_duree: duree,
    });
    if (error) throw new Error("Impossible de charger les créneaux.");
    return (rows ?? []).map((r) => String(r.heure_debut).slice(0, 5));
  });

/** Nombre de créneaux libres pour chaque jour du mois demandé. */
export const getDisponibilitesMois = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => moisSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabasePublic, chargerSelection } = await import("./reservation.server");
    const client = supabasePublic();
    const { duree } = await chargerSelection(client, data.prestationIds);
    const [y, m] = data.mois.split("-").map(Number);
    const jours = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const dates = Array.from(
      { length: jours },
      (_, i) => `${data.mois}-${String(i + 1).padStart(2, "0")}`,
    );
    const res = await Promise.all(
      dates.map(async (date) => {
        const { data: rows } = await client.rpc("get_creneaux_disponibles_duree", {
          date_recherche: date,
          p_duree: duree,
        });
        return { date, creneaux: rows?.length ?? 0 };
      }),
    );
    return res;
  });

export const creerReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reservationPubliqueSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { versEmail, SELECT_AVEC_PRESTATION, chargerSelection } =
      await import("./reservation.server");
    const { nomsPrestations } = await import("./selection");
    const { parisToUtc } = await import("./tz");
    const { emailDemandeCliente, emailNouvelleDemandeGerante } = await import("./emails.server");
    const { semblableHumain, limiterReservations } = await import("./anti-spam.server");
    const { configPaiement, clePublique } = await import("./stripe.server");
    const { preparerSecrets } = await import("./secrets.server");
    const { libererReservationsExpirees, finBlocageProvisoire, intentionPaiement } =
      await import("./acompte.server");
    const { montantAcompte } = await import("./acompte");
    await preparerSecrets();

    if (!semblableHumain(data)) {
      throw new Error("Envoi refusé. Merci de patienter quelques secondes puis de réessayer.");
    }
    await limiterReservations(supabaseAdmin, { email: data.email, telephone: data.telephone });

    // Prix et durées relus en base, puis additionnés.
    const selection = await chargerSelection(supabaseAdmin, data.prestationIds);

    // Libère d'abord les réservations provisoires dont le délai de paiement est dépassé.
    await libererReservationsExpirees(supabaseAdmin);

    // Vérification finale de disponibilité côté serveur
    const { data: libres } = await supabaseAdmin.rpc("get_creneaux_disponibles_duree", {
      date_recherche: data.date,
      p_duree: selection.duree,
    });
    const dispo = (libres ?? []).some((r) => String(r.heure_debut).slice(0, 5) === data.heure);
    if (!dispo) {
      throw new Error("Ce créneau vient d'être pris. Merci de choisir un autre horaire.");
    }

    const debut = parisToUtc(data.date, data.heure);
    const fin = new Date(debut.getTime() + selection.duree * 60000);
    const prix = selection.prix;
    // Paiement de l'acompte en ligne : Stripe actif et acompte à payer
    // (une sélection uniquement « sur devis » n'a pas d'acompte).
    const config = configPaiement();
    const acompteAPayer = montantAcompte(prix) >= 0.5;
    // Jamais de rendez-vous enregistré sans acompte payé : si le paiement en
    // ligne n'est pas disponible, on refuse AVANT d'enregistrer quoi que ce soit.
    if (acompteAPayer && !config.actif) {
      console.error("[creerReservation] paiement en ligne indisponible (secrets Stripe non lus)");
      throw new Error(PAIEMENT_INDISPONIBLE);
    }
    const paiement = { actif: acompteAPayer };

    const { data: row, error } = await supabaseAdmin
      .from("reservations")
      .insert({
        // Première prestation (compatibilité) + liste complète figée.
        prestation_id: selection.lignes[0].id,
        prestations_detail: selection.lignes,
        date_debut: debut.toISOString(),
        date_fin: fin.toISOString(),
        cliente_prenom: data.prenom,
        cliente_nom: data.nom,
        cliente_telephone: data.telephone,
        cliente_email: data.email,
        commentaire: data.commentaire || null,
        statut: "en_attente",
        prix_total: prix,
        acompte_montant: montantAcompte(prix),
        // Paiement en ligne actif : réservation provisoire, créneau bloqué le temps du paiement.
        acompte_statut: paiement.actif ? "en_attente" : "non_requis",
        acompte_expire_le: paiement.actif ? finBlocageProvisoire().toISOString() : null,
        fin_bloquee: fin.toISOString(),
      })
      .select(SELECT_AVEC_PRESTATION)
      .single();

    if (error) {
      console.error("[creerReservation]", error.message);
      if (error.code === "23P01") {
        throw new Error("Ce créneau vient d'être pris. Merci de choisir un autre horaire.");
      }
      throw new Error("Impossible d'enregistrer la réservation. Merci de réessayer.");
    }

    const resume = {
      id: row.id,
      dateDebut: row.date_debut,
      dateFin: row.date_fin,
      token: row.token_annulation,
      prestation: nomsPrestations(selection.lignes),
      dureeMinutes: selection.duree,
      prix,
    };

    if (paiement.actif) {
      try {
        // Paiement de l'acompte intégré à la page (étape « Paiement »).
        const { clientSecret } = await intentionPaiement(supabaseAdmin, row as never);
        // Les e-mails partent une fois l'acompte payé.
        return {
          ...resume,
          paiement: {
            clientSecret,
            clePublique: clePublique(),
            acompte: Number(row.acompte_montant ?? 0),
            expireLe: row.acompte_expire_le,
          },
        };
      } catch (e) {
        console.error("[creerReservation] Stripe", e);
        // Le créneau est aussitôt libéré : rien n'est bloqué sans paiement possible.
        await supabaseAdmin
          .from("reservations")
          .update({ statut: "annulee", acompte_statut: "expire" })
          .eq("id", row.id);
        throw new Error(PAIEMENT_INDISPONIBLE);
      }
    }

    // Sélection uniquement « sur devis » : aucun acompte à payer.
    const mail = versEmail(row as never);
    await Promise.allSettled([emailDemandeCliente(mail), emailNouvelleDemandeGerante(mail)]);
    return { ...resume, paiement: null };
  });

/** Message affiché quand le paiement en ligne ne peut pas être ouvert. */
const PAIEMENT_INDISPONIBLE = `Le paiement en ligne est momentanément indisponible : votre rendez-vous n'a pas été enregistré. Merci de nous contacter au ${business.phoneDisplay}.`;

/** Paiement en ligne actif ? (aucune clé secrète n'est renvoyée au navigateur) */
export const infosPaiement = createServerFn({ method: "GET" }).handler(async () => {
  const { preparerSecrets } = await import("./secrets.server");
  await preparerSecrets();
  const { configPaiement } = await import("./stripe.server");
  return configPaiement();
});

/** Reprise du paiement intégré d'une réservation provisoire encore valable. */
export const preparerPaiement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { preparerSecrets } = await import("./secrets.server");
    await preparerSecrets();
    const { configPaiement, clePublique } = await import("./stripe.server");
    const { intentionPaiement } = await import("./acompte.server");
    const { data: row } = await supabaseAdmin
      .from("reservations")
      .select(
        "id, statut, date_debut, cliente_email, acompte_montant, acompte_statut, acompte_expire_le, stripe_payment_intent, prestations_detail, prestations(nom)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (
      !row ||
      row.acompte_statut !== "en_attente" ||
      row.statut === "annulee" ||
      !row.acompte_expire_le ||
      new Date(row.acompte_expire_le).getTime() < Date.now()
    ) {
      throw new Error(
        "Le délai de paiement est dépassé et le créneau a été libéré. Merci de refaire une réservation.",
      );
    }
    const config = configPaiement();
    if (!config.actif) throw new Error(PAIEMENT_INDISPONIBLE);
    try {
      const { clientSecret } = await intentionPaiement(supabaseAdmin, row as never);
      return {
        clientSecret,
        clePublique: clePublique(),
        acompte: Number(row.acompte_montant ?? 0),
        expireLe: row.acompte_expire_le,
      };
    } catch (e) {
      console.error("[preparerPaiement]", e);
      throw new Error(PAIEMENT_INDISPONIBLE);
    }
  });

/** Après le paiement dans la page : vérification auprès de Stripe et enregistrement. */
export const confirmerPaiement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { preparerSecrets } = await import("./secrets.server");
    await preparerSecrets();
    const { verifierPaiement } = await import("./acompte.server");
    const { data: row } = await supabaseAdmin
      .from("reservations")
      .select("id, acompte_statut, stripe_session_id, stripe_payment_intent")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Réservation introuvable.");
    if (row.acompte_statut === "paye") return { paye: true };
    return { paye: await verifierPaiement(supabaseAdmin, row) };
  });

/** État de l'acompte d'un rendez-vous, pour la page de retour du paiement. */
export const etatAcompte = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { nomsPrestations, lignesDuRendezVous } = await import("./selection");
    const { verifierPaiement } = await import("./acompte.server");
    const { preparerSecrets } = await import("./secrets.server");
    await preparerSecrets();
    const colonnes =
      "id, statut, date_debut, prix_total, prestations_detail, acompte_montant, acompte_statut, acompte_expire_le, stripe_session_id, stripe_payment_intent, prestations(nom, prix, duree_minutes)";
    const lire = () =>
      supabaseAdmin.from("reservations").select(colonnes).eq("id", data.id).maybeSingle();
    let { data: row } = await lire();
    if (!row) return null;
    // Retour de Stripe : on vérifie directement le paiement (sans attendre le webhook).
    if (await verifierPaiement(supabaseAdmin, row)) {
      row = (await lire()).data ?? row;
    }
    const expire =
      row.acompte_statut === "en_attente" &&
      !!row.acompte_expire_le &&
      new Date(row.acompte_expire_le).getTime() < Date.now();
    return {
      prestation: nomsPrestations(lignesDuRendezVous(row)) || "Prestation",
      dateDebut: row.date_debut,
      prix: Number(row.prix_total ?? row.prestations?.prix ?? 0),
      acompte: row.acompte_montant == null ? null : Number(row.acompte_montant),
      acompteStatut: expire ? "expire" : row.acompte_statut,
      statut: row.statut,
      expireLe: row.acompte_expire_le,
    };
  });

export const annulerReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { versEmail, SELECT_AVEC_PRESTATION } = await import("./reservation.server");
    const { emailAnnulationGerante, emailAlerteGerante, emailAnnulationCliente } =
      await import("./emails.server");
    const { ANNULATION_TROP_TARD } = await import("./annulation");
    const { rembourserAcompte } = await import("./acompte.server");
    const { formatEuros } = await import("./tz");
    const { preparerSecrets } = await import("./secrets.server");
    await preparerSecrets();

    const { data: row } = await supabaseAdmin
      .from("reservations")
      .select(SELECT_AVEC_PRESTATION)
      .eq("token_annulation", data.token)
      .maybeSingle();
    if (!row) throw new Error("Lien d'annulation inconnu ou expiré.");

    // La base n'accepte l'annulation en ligne qu'à plus de 72 h du rendez-vous.
    const { data: ok } = await supabaseAdmin.rpc("annuler_reservation", { p_token: data.token });
    if (!ok) {
      return {
        annulee: false,
        message:
          row.statut === "annulee"
            ? "Ce rendez-vous est déjà annulé."
            : ["en_attente", "confirmee"].includes(row.statut) &&
                new Date(row.date_debut).getTime() > Date.now()
              ? ANNULATION_TROP_TARD
              : "Ce rendez-vous ne peut plus être annulé.",
        dateDebut: row.date_debut,
      };
    }

    // Plus de 72 h avant : l'acompte payé est remboursé.
    let message = "Votre rendez-vous a bien été annulé.";
    let etatAcompteMail = row.acompte_statut;
    if (row.acompte_statut === "paye") {
      const rembourse = await rembourserAcompte(supabaseAdmin, row);
      const montant = formatEuros(Number(row.acompte_montant ?? 0));
      if (rembourse) {
        etatAcompteMail = "rembourse";
        message += ` Votre acompte de ${montant} est remboursé : il apparaît en général sous 5 à 10 jours sur votre compte.`;
      } else {
        message += ` Votre acompte de ${montant} vous sera remboursé : Emerald Beauty s'en occupe.`;
        await emailAlerteGerante(
          versEmail(row as never),
          "Rendez-vous annulé en ligne plus de 72 h avant : le remboursement automatique de l'acompte a échoué. Remboursez-le depuis le tableau de bord Stripe.",
        );
      }
    }

    const mail = versEmail({ ...row, acompte_statut: etatAcompteMail } as never);
    await Promise.allSettled([emailAnnulationGerante(mail), emailAnnulationCliente(mail, message)]);
    return { annulee: true, message, dateDebut: row.date_debut };
  });

// ------------------------------------------------------------
// BACK-OFFICE (gérante authentifiée)
// ------------------------------------------------------------
/** Envoie un e-mail de test à la gérante pour vérifier la configuration Resend. */
export const adminEmailTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { emailTestGerante } = await import("./emails.server");
    return emailTestGerante();
  });

/** Refus d'une demande par la gérante : acompte remboursé intégralement + e-mail. */
export const adminRefuserReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante, versEmail, SELECT_AVEC_PRESTATION } =
      await import("./reservation.server");
    await assertGerante(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rembourserAcompte, fermerSessionPaiement, annulerIntention } =
      await import("./acompte.server");
    const { emailRefusCliente } = await import("./emails.server");
    const { preparerSecrets } = await import("./secrets.server");
    await preparerSecrets();

    const { data: row } = await supabaseAdmin
      .from("reservations")
      .select(SELECT_AVEC_PRESTATION)
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Rendez-vous introuvable.");
    if (row.statut === "annulee") throw new Error("Ce rendez-vous est déjà annulé.");

    let rembourse = false;
    if (row.acompte_statut === "paye") {
      rembourse = await rembourserAcompte(supabaseAdmin, row);
    } else if (row.acompte_statut === "en_attente") {
      await fermerSessionPaiement(row.stripe_session_id);
      await annulerIntention(row.stripe_payment_intent);
    }
    const acompteStatut = rembourse
      ? "rembourse"
      : row.acompte_statut === "en_attente"
        ? "expire"
        : row.acompte_statut;
    const { error } = await supabaseAdmin
      .from("reservations")
      .update({ statut: "annulee", acompte_statut: acompteStatut })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const mail = versEmail({ ...row, acompte_statut: acompteStatut } as never);
    await Promise.allSettled([emailRefusCliente(mail, rembourse)]);
    return {
      ok: true,
      acompteEtaitPaye: row.acompte_statut === "paye",
      rembourse,
    };
  });

/** État du paiement en ligne (format des secrets, connexion à Stripe), sans aucune clé. */
export const adminDiagnosticPaiement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { diagnosticPaiement } = await import("./stripe.server");
    return diagnosticPaiement();
  });

export const adminReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante, SELECT_AVEC_PRESTATION } = await import("./reservation.server");
    await assertGerante(context as never);
    const { data, error } = await context.supabase
      .from("reservations")
      .select(SELECT_AVEC_PRESTATION)
      .order("date_debut", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminPrestations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { data, error } = await context.supabase
      .from("prestations")
      .select("*")
      .order("ordre", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Réglages généraux (temps de battement entre deux clientes). */
export const adminReglages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { data, error } = await context.supabase
      .from("reglages")
      .select("battement_minutes")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { battementMinutes: data?.battement_minutes ?? 10 };
  });

export const adminEnregistrerReglages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reglagesSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { error } = await context.supabase
      .from("reglages")
      .update({ battement_minutes: data.battementMinutes })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminHoraires = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { data, error } = await context.supabase
      .from("horaires_ouverture")
      .select("*")
      .order("jour_semaine", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminIndisponibilites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { data, error } = await context.supabase
      .from("indisponibilites")
      .select("*")
      .order("date_debut", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminChangerStatut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante, versEmail, SELECT_AVEC_PRESTATION } =
      await import("./reservation.server");
    await assertGerante(context as never);
    const { data: row, error } = await context.supabase
      .from("reservations")
      .update({ statut: data.statut })
      .eq("id", data.id)
      .select(SELECT_AVEC_PRESTATION)
      .single();
    if (error) throw new Error(error.message);
    if (data.statut === "confirmee") {
      const { emailConfirmationCliente } = await import("./emails.server");
      await Promise.allSettled([emailConfirmationCliente(versEmail(row as never))]);
    }
    return { ok: true };
  });

export const adminCreerReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reservationManuelleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    const { parisToUtc } = await import("./tz");
    await assertGerante(context as never);

    const { nomComplet } = await import("./selection");
    const { data: prestation } = await context.supabase
      .from("prestations")
      .select("id, nom, prix, duree_minutes, categorie, sur_devis, en_option")
      .eq("id", data.prestationId)
      .maybeSingle();
    if (!prestation) throw new Error("Prestation introuvable.");
    const prixLigne = prestation.sur_devis ? 0 : Number(prestation.prix);

    const debut = parisToUtc(data.date, data.heure);
    const fin = new Date(debut.getTime() + prestation.duree_minutes * 60000);
    const { error } = await context.supabase.from("reservations").insert({
      prestation_id: data.prestationId,
      prix_total: prixLigne,
      prestations_detail: [
        {
          id: prestation.id,
          nom: nomComplet(prestation.nom, prestation.categorie),
          prix: prixLigne,
          duree_minutes: prestation.duree_minutes,
          categorie: prestation.categorie,
          sur_devis: prestation.sur_devis,
          en_option: prestation.en_option,
        },
      ],
      date_debut: debut.toISOString(),
      date_fin: fin.toISOString(),
      cliente_prenom: data.prenom,
      cliente_nom: data.nom,
      cliente_telephone: data.telephone,
      cliente_email: data.email || "non-communique@local",
      commentaire: data.commentaire || null,
      statut: data.statut,
      fin_bloquee: fin.toISOString(),
    });
    if (error) {
      if (error.code === "23P01") throw new Error("Ce créneau chevauche un rendez-vous existant.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminEnregistrerPrestation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => prestationSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const row = {
      nom: data.nom,
      description: data.description,
      categorie: data.categorie,
      duree_minutes: data.dureeMinutes,
      prix: data.prix,
      couleur: data.couleur,
      actif: data.actif,
      ordre: data.ordre,
      sur_devis: data.surDevis,
      en_option: data.enOption,
    };
    const { error } = data.id
      ? await context.supabase.from("prestations").update(row).eq("id", data.id)
      : await context.supabase.from("prestations").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminEnregistrerHoraire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => horaireSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { error } = await context.supabase.from("horaires_ouverture").upsert(
      {
        jour_semaine: data.jourSemaine,
        heure_debut: data.heureDebut,
        heure_fin: data.heureFin,
        pause_debut: data.pauseDebut || null,
        pause_fin: data.pauseFin || null,
        ferme: data.ferme,
      },
      { onConflict: "jour_semaine" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAjouterIndisponibilite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => indisponibiliteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    const { parisToUtc } = await import("./tz");
    await assertGerante(context as never);
    const debut = parisToUtc(data.dateDebut, data.heureDebut);
    const fin = parisToUtc(data.dateFin, data.heureFin);
    if (fin <= debut) throw new Error("La fin doit être postérieure au début.");
    const { error } = await context.supabase.from("indisponibilites").insert({
      date_debut: debut.toISOString(),
      date_fin: fin.toISOString(),
      motif: data.motif,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSupprimerIndisponibilite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertGerante } = await import("./reservation.server");
    await assertGerante(context as never);
    const { error } = await context.supabase.from("indisponibilites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
