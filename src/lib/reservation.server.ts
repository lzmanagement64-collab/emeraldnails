// ============================================================
// Helpers serveur pour la réservation (jamais envoyé au navigateur).
// ============================================================
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ReservationEmail } from "./emails.server";
import {
  lignesDuRendezVous,
  nomComplet,
  nomsPrestations,
  problemeSelection,
  totaux,
  type LignePrestation,
} from "./selection";

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

/**
 * Prestations choisies, relues en base (jamais les prix envoyés par le navigateur),
 * dans l'ordre choisi par la cliente. Erreur si l'une n'est plus proposée.
 */
export async function chargerSelection(
  client: ReturnType<typeof supabasePublic>,
  ids: string[],
): Promise<{ lignes: LignePrestation[]; prix: number; duree: number }> {
  const { data, error } = await client
    .from("prestations")
    .select("id, nom, prix, duree_minutes, categorie, sur_devis, en_option")
    .in("id", ids)
    .eq("actif", true);
  if (error) throw new Error("Impossible de charger les prestations.");
  const parId = new Map((data ?? []).map((p) => [p.id, p]));
  const lignes = ids.map((id) => parId.get(id));
  if (lignes.some((l) => !l)) throw new Error("Une prestation choisie n'est plus disponible.");
  // Prix, durées et options relus en base : rien ne vient du navigateur.
  const propres: LignePrestation[] = lignes.map((l) => ({
    id: l!.id,
    nom: nomComplet(l!.nom, l!.categorie),
    prix: l!.sur_devis ? 0 : Number(l!.prix),
    duree_minutes: Number(l!.duree_minutes),
    categorie: l!.categorie,
    sur_devis: l!.sur_devis,
    en_option: l!.en_option,
  }));
  const probleme = problemeSelection(propres);
  if (probleme) throw new Error(probleme);
  return { lignes: propres, ...totaux(propres) };
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
  prestation_id?: string;
  prestations_detail?: unknown;
  prestations: { nom: string; duree_minutes: number; prix: number } | null;
};

export const SELECT_AVEC_PRESTATION =
  "id, prestation_id, date_debut, date_fin, statut, cliente_prenom, cliente_nom, cliente_telephone, cliente_email, commentaire, token_annulation, cree_le, prix_total, prestations_detail, acompte_montant, acompte_statut, acompte_expire_le, acompte_paye_le, stripe_session_id, stripe_payment_intent, prestations(nom, duree_minutes, prix, couleur)";

export function versEmail(row: RowAvecPrestation): ReservationEmail {
  return {
    id: row.id,
    prestation: nomsPrestations(lignesDuRendezVous(row)) || "Prestation",
    dureeMinutes: totaux(lignesDuRendezVous(row)).duree || 60,
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
