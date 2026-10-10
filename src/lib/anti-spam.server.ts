// ============================================================
// Anti-spam côté serveur (jamais envoyé au navigateur).
// Les volumes sont comptés en base avec le client serveur :
// un robot qui appelle directement le serveur est aussi limité.
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { business } from "@/config/business";
import { DUREE_MIN_MS } from "./anti-spam";

type Admin = SupabaseClient<Database>;

const LIMITES = {
  /** Demandes de rendez-vous par e-mail ou téléphone sur 24 h. */
  reservationsParContact: 3,
  /** Demandes de rendez-vous tous contacts confondus sur 1 h (anti-déferlante). */
  reservationsParHeure: 20,
  /** Messages de contact par e-mail sur 24 h. */
  messagesParEmail: 3,
  /** Messages de contact tous contacts confondus sur 1 h. */
  messagesParHeure: 20,
};

const ilYa = (ms: number) => new Date(Date.now() - ms).toISOString();
const HEURE = 3600_000;

/** Faux si l'envoi ressemble à un robot (champ piège rempli ou envoi instantané). */
export function semblableHumain(d: { siteWeb?: string; dureeMs: number }) {
  if (d.siteWeb && d.siteWeb.trim() !== "") return false;
  return d.dureeMs >= DUREE_MIN_MS;
}

export async function limiterReservations(
  admin: Admin,
  contact: { email: string; telephone: string },
) {
  const compter = () => admin.from("reservations").select("id", { count: "exact", head: true });
  const [parEmail, parTel, total] = await Promise.all([
    compter()
      .eq("cliente_email", contact.email)
      .gte("cree_le", ilYa(24 * HEURE)),
    compter()
      .eq("cliente_telephone", contact.telephone)
      .gte("cree_le", ilYa(24 * HEURE)),
    compter().gte("cree_le", ilYa(HEURE)),
  ]);
  if (
    (parEmail.count ?? 0) >= LIMITES.reservationsParContact ||
    (parTel.count ?? 0) >= LIMITES.reservationsParContact
  ) {
    throw new Error(
      `Vous avez déjà envoyé plusieurs demandes aujourd'hui. Pour un autre rendez-vous, appelez le ${business.phoneDisplay}.`,
    );
  }
  if ((total.count ?? 0) >= LIMITES.reservationsParHeure) {
    throw new Error(
      `Beaucoup de demandes en ce moment. Merci de réessayer plus tard ou d'appeler le ${business.phoneDisplay}.`,
    );
  }
}

export async function limiterMessages(admin: Admin, email: string) {
  const compter = () => admin.from("leads").select("id", { count: "exact", head: true });
  const [parEmail, total] = await Promise.all([
    compter()
      .eq("email", email)
      .gte("created_at", ilYa(24 * HEURE)),
    compter().gte("created_at", ilYa(HEURE)),
  ]);
  if (
    (parEmail.count ?? 0) >= LIMITES.messagesParEmail ||
    (total.count ?? 0) >= LIMITES.messagesParHeure
  ) {
    throw new Error(
      `Trop de messages envoyés. Merci de réessayer plus tard ou d'appeler le ${business.phoneDisplay}.`,
    );
  }
}
