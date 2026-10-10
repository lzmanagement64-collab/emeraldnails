// ============================================================
// Plusieurs prestations dans un même rendez-vous : additions communes
// au site (affichage) et au serveur (montants réellement enregistrés).
// ============================================================

export type LignePrestation = {
  id: string;
  nom: string;
  prix: number;
  duree_minutes: number;
};

/** Nombre maximum de prestations dans une même réservation. */
export const MAX_PRESTATIONS = 6;

const arrondi = (v: number) => Math.round(v * 100) / 100;

/** Prix total (au centime) et durée totale (en minutes). */
export function totaux(lignes: Pick<LignePrestation, "prix" | "duree_minutes">[]) {
  return {
    prix: arrondi(lignes.reduce((s, l) => s + Number(l.prix), 0)),
    duree: lignes.reduce((s, l) => s + Number(l.duree_minutes), 0),
  };
}

/** « Dépose semi-permanent + Semi-permanent » */
export const nomsPrestations = (lignes: Pick<LignePrestation, "nom">[]) =>
  lignes.map((l) => l.nom).join(" + ");

/**
 * Prestations d'un rendez-vous enregistré : la liste figée à la réservation,
 * ou, pour les rendez-vous plus anciens / saisis dans l'admin, la prestation unique.
 */
export function lignesDuRendezVous(r: {
  prestation_id?: string;
  prestations_detail?: unknown;
  prestations?: { nom: string; prix: number; duree_minutes: number } | null;
}): LignePrestation[] {
  if (Array.isArray(r.prestations_detail) && r.prestations_detail.length > 0) {
    return (r.prestations_detail as LignePrestation[]).map((l) => ({
      id: String(l.id),
      nom: String(l.nom),
      prix: Number(l.prix),
      duree_minutes: Number(l.duree_minutes),
    }));
  }
  if (r.prestations) {
    return [
      {
        id: r.prestation_id ?? "",
        nom: r.prestations.nom,
        prix: Number(r.prestations.prix),
        duree_minutes: Number(r.prestations.duree_minutes),
      },
    ];
  }
  return [];
}
