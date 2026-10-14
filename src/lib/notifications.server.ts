// ============================================================
// Notifications envoyées à Maria (app « Emerald Beauty Pro »).
// Jamais de donnée sensible : ni nom, ni téléphone, ni e-mail de cliente,
// seulement le jour, l'heure et l'état du paiement.
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { notifierGerante } from "./push.server";

type Admin = SupabaseClient<Database>;
const TZ = "Europe/Paris";

/** « 14 h » ou « 14 h 30 ». */
function heure(d: Date) {
  const [h, m] = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .split(":");
  return `${Number(h)} h${m === "00" ? "" : ` ${m}`}`;
}

/** « mardi 21 oct., 14 h 30 » */
export function quandCourt(iso: string) {
  const d = new Date(iso);
  const jour = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${jour}, ${heure(d)}`;
}

/** Nouvelle réservation : payée (acompte ou totalité) ou sur devis. */
export async function notifNouvelleReservation(
  admin: Admin,
  r: { dateDebut: string; paiement: "acompte" | "total" | "aucun" },
) {
  await notifierGerante(admin, {
    titre: `Nouvelle réservation – ${quandCourt(r.dateDebut)}`,
    corps:
      r.paiement === "total"
        ? "Payé intégralement · à valider"
        : r.paiement === "acompte"
          ? "Acompte payé · à valider"
          : "Sur devis · à confirmer",
    tag: "reservation",
  });
}

/** Annulation faite par une cliente. */
export async function notifAnnulation(admin: Admin, dateDebut: string) {
  await notifierGerante(admin, {
    titre: `Annulation – ${quandCourt(dateDebut)}`,
    corps: "Le créneau est de nouveau libre.",
    tag: "annulation",
  });
}

/**
 * Rappel des rendez-vous du jour, envoyé une seule fois le matin (entre 7 h
 * et 11 h, heure de Paris) par l'appel horaire des rappels automatiques.
 */
export async function rappelDuMatin(admin: Admin, maintenant = new Date()) {
  const h = Number(
    new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", hour12: false }).format(
      maintenant,
    ),
  );
  if (h < 7 || h > 11) return { envoye: false };
  const jour = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(maintenant); // AAAA-MM-JJ

  // Une seule fois par jour, même si l'appel est répété.
  const { error } = await admin.from("push_envois_quotidiens").insert({ jour });
  if (error) return { envoye: false };

  const debut = new Date(`${jour}T00:00:00Z`);
  const { data } = await admin
    .from("reservations")
    .select("date_debut, statut, acompte_statut")
    .gte("date_debut", new Date(debut.getTime() - 3 * 3600_000).toISOString())
    .lt("date_debut", new Date(debut.getTime() + 27 * 3600_000).toISOString())
    .in("statut", ["confirmee", "en_attente"])
    .order("date_debut", { ascending: true });
  const duJour = (data ?? []).filter(
    (r) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(r.date_debut)) === jour &&
      (r.statut === "confirmee" || ["paye", "non_requis"].includes(r.acompte_statut)),
  );
  if (!duJour.length) return { envoye: false };
  const aValider = duJour.filter((r) => r.statut === "en_attente").length;
  await notifierGerante(admin, {
    titre: `Aujourd'hui : ${duJour.length} rendez-vous`,
    corps: `${duJour.map((r) => heure(new Date(r.date_debut))).join(" · ")}${aValider ? ` (dont ${aValider} à valider)` : ""}`,
    tag: "rappel-jour",
  });
  return { envoye: true };
}
