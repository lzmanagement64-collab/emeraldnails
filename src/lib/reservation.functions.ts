// ============================================================
// Fonctions serveur — réservation publique & back-office.
// Le navigateur d'une visiteuse ne lit JAMAIS la table reservations :
// seules des heures de début sortent de la base (fonction Postgres).
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  creneauxSchema,
  moisSchema,
  reservationPubliqueSchema,
  reservationManuelleSchema,
  statutSchema,
  prestationSchema,
  horaireSchema,
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
    .select("id, nom, description, duree_minutes, prix, couleur, ordre")
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
    const { supabasePublic } = await import("./reservation.server");
    const { data: rows, error } = await supabasePublic().rpc("get_creneaux_disponibles", {
      date_recherche: data.date,
      prestation_id: data.prestationId,
    });
    if (error) throw new Error("Impossible de charger les créneaux.");
    return (rows ?? []).map((r) => String(r.heure_debut).slice(0, 5));
  });

/** Nombre de créneaux libres pour chaque jour du mois demandé. */
export const getDisponibilitesMois = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => moisSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabasePublic } = await import("./reservation.server");
    const client = supabasePublic();
    const [y, m] = data.mois.split("-").map(Number);
    const jours = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const dates = Array.from(
      { length: jours },
      (_, i) => `${data.mois}-${String(i + 1).padStart(2, "0")}`,
    );
    const res = await Promise.all(
      dates.map(async (date) => {
        const { data: rows } = await client.rpc("get_creneaux_disponibles", {
          date_recherche: date,
          prestation_id: data.prestationId,
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
    const { versEmail, SELECT_AVEC_PRESTATION } = await import("./reservation.server");
    const { parisToUtc } = await import("./tz");
    const { emailDemandeCliente, emailNouvelleDemandeGerante } = await import("./emails.server");

    const { data: prestation } = await supabaseAdmin
      .from("prestations")
      .select("id, nom, duree_minutes, prix")
      .eq("id", data.prestationId)
      .eq("actif", true)
      .maybeSingle();
    if (!prestation) throw new Error("Cette prestation n'est plus disponible.");

    // Vérification finale de disponibilité côté serveur
    const { data: libres } = await supabaseAdmin.rpc("get_creneaux_disponibles", {
      date_recherche: data.date,
      prestation_id: data.prestationId,
    });
    const dispo = (libres ?? []).some((r) => String(r.heure_debut).slice(0, 5) === data.heure);
    if (!dispo) {
      throw new Error("Ce créneau vient d'être pris. Merci de choisir un autre horaire.");
    }

    const debut = parisToUtc(data.date, data.heure);
    const fin = new Date(debut.getTime() + prestation.duree_minutes * 60000);

    const { data: row, error } = await supabaseAdmin
      .from("reservations")
      .insert({
        prestation_id: data.prestationId,
        date_debut: debut.toISOString(),
        date_fin: fin.toISOString(),
        cliente_prenom: data.prenom,
        cliente_nom: data.nom,
        cliente_telephone: data.telephone,
        cliente_email: data.email,
        commentaire: data.commentaire || null,
        statut: "en_attente",
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

    const mail = versEmail(row as never);
    await Promise.allSettled([emailDemandeCliente(mail), emailNouvelleDemandeGerante(mail)]);

    return {
      id: row.id,
      dateDebut: row.date_debut,
      dateFin: row.date_fin,
      token: row.token_annulation,
      prestation: prestation.nom,
      dureeMinutes: prestation.duree_minutes,
      prix: Number(prestation.prix),
    };
  });

export const annulerReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { versEmail, SELECT_AVEC_PRESTATION } = await import("./reservation.server");
    const { emailAnnulationGerante } = await import("./emails.server");

    const { data: row } = await supabaseAdmin
      .from("reservations")
      .select(SELECT_AVEC_PRESTATION)
      .eq("token_annulation", data.token)
      .maybeSingle();
    if (!row) throw new Error("Lien d'annulation inconnu ou expiré.");

    const { data: ok } = await supabaseAdmin.rpc("annuler_reservation", { p_token: data.token });
    if (!ok) {
      return {
        annulee: false,
        message:
          row.statut === "annulee"
            ? "Ce rendez-vous est déjà annulé."
            : "Ce rendez-vous ne peut plus être annulé en ligne. Merci de nous appeler.",
        dateDebut: row.date_debut,
      };
    }

    await Promise.allSettled([emailAnnulationGerante(versEmail(row as never))]);
    return {
      annulee: true,
      message: "Votre rendez-vous a bien été annulé.",
      dateDebut: row.date_debut,
    };
  });

// ------------------------------------------------------------
// BACK-OFFICE (gérante authentifiée)
// ------------------------------------------------------------
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

    const { data: prestation } = await context.supabase
      .from("prestations")
      .select("duree_minutes")
      .eq("id", data.prestationId)
      .maybeSingle();
    if (!prestation) throw new Error("Prestation introuvable.");

    const debut = parisToUtc(data.date, data.heure);
    const fin = new Date(debut.getTime() + prestation.duree_minutes * 60000);
    const { error } = await context.supabase.from("reservations").insert({
      prestation_id: data.prestationId,
      date_debut: debut.toISOString(),
      date_fin: fin.toISOString(),
      cliente_prenom: data.prenom,
      cliente_nom: data.nom,
      cliente_telephone: data.telephone,
      cliente_email: data.email || "non-communique@local",
      commentaire: data.commentaire || null,
      statut: data.statut,
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
      duree_minutes: data.dureeMinutes,
      prix: data.prix,
      couleur: data.couleur,
      actif: data.actif,
      ordre: data.ordre,
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
