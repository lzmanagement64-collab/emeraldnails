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
  prix_total: number | null;
  acompte_montant: number | null;
  acompte_statut: string;
  prestations: { nom: string; duree_minutes: number; prix: number } | null;
};

export const SELECT_AVEC_PRESTATION =
  "id, prestation_id, date_debut, date_fin, statut, cliente_prenom, cliente_nom, cliente_telephone, cliente_email, commentaire, token_annulation, cree_le, prix_total, acompte_montant, acompte_statut, acompte_expire_le, acompte_paye_le, stripe_session_id, stripe_payment_intent, prestations(nom, duree_minutes, prix, couleur)";

export function versEmail(row: RowAvecPrestation): ReservationEmail {
  return {
    id: row.id,
    prestation: row.prestations?.nom ?? "Prestation",
    dureeMinutes: row.prestations?.duree_minutes ?? 60,
    prix: Number(row.prix_total ?? row.prestations?.prix ?? 0),
    acompteMontant: row.acompte_montant == null ? null : Number(row.acompte_montant),
    acompteStatut: row.acompte_statut,
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
  claims?: { email?: string | null } | null;
};

/**
 * Vérifie que le compte connecté est bien celui de la gérante :
 * liste blanche d'e-mails + rôle admin/staff en base. Vérification serveur.
 */
export async function assertGerante(context: StaffContext) {
  const { assertStaff } = await import("./admin-guard.server");
  await assertStaff(context);
}
