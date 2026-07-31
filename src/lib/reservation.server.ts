// ============================================================
// Helpers serveur pour la réservation (jamais envoyé au navigateur).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ReservationEmail } from "./emails.server";

/** Client publiable côté serveur : lectures publiques (prestations, horaires, créneaux). */
export function supabasePublic() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

type RowAvecPrestation = {
  id: string;
  date_debut: string;
  cliente_prenom: string;
  cliente_nom: string;
  cliente_telephone: string;
  cliente_email: string;
  commentaire: string | null;
  token_annulation: string;
  prestations: { nom: string; duree_minutes: number; prix: number } | null;
};

export const SELECT_AVEC_PRESTATION =
  "id, prestation_id, date_debut, date_fin, statut, cliente_prenom, cliente_nom, cliente_telephone, cliente_email, commentaire, token_annulation, cree_le, prestations(nom, duree_minutes, prix, couleur)";

export function versEmail(row: RowAvecPrestation): ReservationEmail {
  return {
    id: row.id,
    prestation: row.prestations?.nom ?? "Prestation",
    dureeMinutes: row.prestations?.duree_minutes ?? 60,
    prix: Number(row.prestations?.prix ?? 0),
    dateDebut: row.date_debut,
    prenom: row.cliente_prenom,
    nom: row.cliente_nom,
    telephone: row.cliente_telephone,
    email: row.cliente_email,
    commentaire: row.commentaire,
    tokenAnnulation: row.token_annulation,
  };
}

type StaffContext = {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
};

/** Vérifie le rôle admin/staff de la gérante. */
export async function assertGerante(context: StaffContext) {
  const [admin, staff] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "staff" }),
  ]);
  if (!admin.data && !staff.data) throw new Error("Accès refusé : compte sans droits de gestion.");
}
