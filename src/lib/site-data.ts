// ============================================================
// Prestations & horaires affichés sur le site public.
// Source unique : la base de données (tables prestations et
// horaires_ouverture), la même que celle gérée depuis /admin.
// ============================================================
import { listHoraires, listPrestations } from "./reservation.functions";
import { listGalerie } from "./galerie.functions";
import type { PhotoGalerie } from "./galerie";
import { photosParDefaut } from "@/data/gallery";

export type PrestationPublique = {
  id: string;
  nom: string;
  description: string;
  categorie: string;
  duree_minutes: number;
  prix: number;
  couleur: string;
  ordre: number;
};

export type Horaire = {
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  pause_debut: string | null;
  pause_fin: string | null;
  ferme: boolean;
};

/** Ne bloque jamais l'affichage d'une page : en cas d'erreur, liste vide. */
export async function chargerPrestations(): Promise<PrestationPublique[]> {
  try {
    return (await listPrestations()) as PrestationPublique[];
  } catch (e) {
    console.error("[chargerPrestations]", e);
    return [];
  }
}

/** Photos visibles de la galerie (photos d'origine si la base ne répond pas). */
export async function chargerGalerie(): Promise<PhotoGalerie[]> {
  try {
    const photos = (await listGalerie()) as PhotoGalerie[];
    return photos.length ? photos : photosParDefaut;
  } catch (e) {
    console.error("[chargerGalerie]", e);
    return photosParDefaut;
  }
}

export async function chargerHoraires(): Promise<Horaire[]> {
  try {
    return (await listHoraires()) as Horaire[];
  } catch (e) {
    console.error("[chargerHoraires]", e);
    return [];
  }
}

const NOMS_JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
// Affichage du lundi au dimanche.
const ORDRE_AFFICHAGE = [1, 2, 3, 4, 5, 6, 0];

/** "09:00:00" → "9h", "17:15:00" → "17h15" */
function heure(t: string) {
  const [h, m] = t.split(":");
  return `${Number(h)}h${m && m !== "00" ? m : ""}`;
}

function plage(h: Horaire) {
  if (h.ferme) return "Fermé";
  if (h.pause_debut && h.pause_fin) {
    return `${heure(h.heure_debut)} – ${heure(h.pause_debut)} · ${heure(h.pause_fin)} – ${heure(h.heure_fin)}`;
  }
  return `${heure(h.heure_debut)} – ${heure(h.heure_fin)}`;
}

/** Lignes { jour, valeur } du lundi au dimanche. Jour absent de la base = fermé. */
export function lignesHoraires(horaires: Horaire[]) {
  // Base injoignable : on n'affiche pas « Fermé » 7 jours sur 7.
  if (!horaires.length) return [{ day: "Horaires", value: "sur demande" }];
  return ORDRE_AFFICHAGE.map((jour) => {
    const h = horaires.find((x) => x.jour_semaine === jour);
    return { day: NOMS_JOURS[jour], value: h ? plage(h) : "Fermé" };
  });
}

/** Résumé court des jours d'ouverture, ex. "Ouvert du mardi au samedi". */
export function resumeJoursOuverture(horaires: Horaire[]) {
  const ouverts = ORDRE_AFFICHAGE.filter((jour) =>
    horaires.some((h) => h.jour_semaine === jour && !h.ferme),
  );
  if (!ouverts.length) return "Horaires sur demande";
  const nom = (j: number) => NOMS_JOURS[j].toLowerCase();
  if (ouverts.length === 1) return `Ouvert le ${nom(ouverts[0])}`;
  const indices = ouverts.map((j) => ORDRE_AFFICHAGE.indexOf(j));
  const consecutifs = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  if (consecutifs) return `Ouvert du ${nom(ouverts[0])} au ${nom(ouverts[ouverts.length - 1])}`;
  return `Ouvert ${ouverts.slice(0, -1).map(nom).join(", ")} et ${nom(ouverts[ouverts.length - 1])}`;
}
