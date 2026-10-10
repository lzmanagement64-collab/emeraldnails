// ============================================================
// Plusieurs prestations dans un même rendez-vous : additions communes
// au site (affichage) et au serveur (montants réellement enregistrés).
// ============================================================
import { formatEuros } from "./tz";

export type LignePrestation = {
  id: string;
  nom: string;
  prix: number;
  duree_minutes: number;
  categorie?: string;
  /** Prix fixé avec Maria : compte dans la durée, pas dans le total ni l'acompte. */
  sur_devis?: boolean;
  /** S'ajoute à une autre prestation (nail art), ne se réserve pas seule. */
  en_option?: boolean;
};

/** Prix affiché d'une prestation : « Sur devis » ou le montant. */
export const prixAffiche = (p: { prix: number; sur_devis?: boolean | null }) =>
  p.sur_devis ? "Sur devis" : formatEuros(p.prix);

/** Prix le plus bas d'une liste (hors « sur devis »), pour « dès … ». */
export function prixMinimum(liste: { prix: number; sur_devis?: boolean | null }[]) {
  const prix = liste.filter((p) => !p.sur_devis).map((p) => Number(p.prix));
  return prix.length ? Math.min(...prix) : null;
}

// Catégories dont le nom ne suffit pas à comprendre la prestation hors de la grille
// (« Pose complète » existe en Extension gel et en Gel-X).
const CATEGORIES_SANS_PREFIXE = ["Ongles naturels", "Autres"];

/** Nom compris partout (récapitulatif, admin, e-mails) : « Gel-X · Pose complète ». */
export function nomComplet(nom: string, categorie?: string | null) {
  const c = categorie?.trim();
  if (!c || CATEGORIES_SANS_PREFIXE.includes(c)) return nom;
  if (nom.toLowerCase().includes(c.toLowerCase())) return nom;
  return `${c} · ${nom}`;
}

/** Message d'erreur si la sélection n'est pas réservable telle quelle, sinon null. */
export function problemeSelection(lignes: Pick<LignePrestation, "en_option">[]) {
  if (lignes.length > 0 && lignes.every((l) => l.en_option)) {
    return "Le nail art s'ajoute à une pose : choisissez aussi une prestation principale.";
  }
  return null;
}

/** Au moins une prestation sur devis : Maria doit établir un devis. */
export const devisAFaire = (lignes: Pick<LignePrestation, "sur_devis">[]) =>
  lignes.some((l) => l.sur_devis);

/** Nombre maximum de prestations dans une même réservation. */
export const MAX_PRESTATIONS = 6;

const arrondi = (v: number) => Math.round(v * 100) / 100;

/** Prix total (au centime) et durée totale (en minutes). */
export function totaux(lignes: Pick<LignePrestation, "prix" | "duree_minutes" | "sur_devis">[]) {
  return {
    // Les prestations sur devis ne comptent ni dans le total ni dans l'acompte.
    prix: arrondi(lignes.reduce((s, l) => s + (l.sur_devis ? 0 : Number(l.prix)), 0)),
    duree: lignes.reduce((s, l) => s + Number(l.duree_minutes), 0),
  };
}

/** « Dépose semi-permanent + Semi-permanent + Nail art premium XL (sur devis) » */
export const nomsPrestations = (lignes: Pick<LignePrestation, "nom" | "sur_devis">[]) =>
  lignes.map((l) => (l.sur_devis ? `${l.nom} (sur devis)` : l.nom)).join(" + ");

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
      categorie: l.categorie,
      sur_devis: !!l.sur_devis,
      en_option: !!l.en_option,
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
