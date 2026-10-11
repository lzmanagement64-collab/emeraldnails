// ============================================================
// Galerie — fonctions serveur.
// Public : lecture des photos visibles. Gestion : réservée à la gérante
// (vérifiée ici ET par les règles de la base / du stockage).
// ============================================================
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { idSchema } from "./reservation-schemas";
import { ordreGalerieSchema, photoAjoutSchema, photoModifSchema, versPhoto } from "./galerie";

const COLONNES =
  "id, titre, categorie, chemin, url_statique, accueil, visible, ordre, banniere, texte_alt";
const urlSupabase = () => process.env["SUPABASE_URL"] ?? "";

/** Photos visibles, dans l'ordre choisi par la gérante. */
export const listGalerie = createServerFn({ method: "GET" }).handler(async () => {
  const { supabasePublic } = await import("./reservation.server");
  const { data, error } = await supabasePublic()
    .from("galerie_photos")
    .select(COLONNES)
    .eq("visible", true)
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Impossible de charger la galerie.");
  return (data ?? []).map((r) => versPhoto(r, urlSupabase()));
});

async function gerante(context: unknown) {
  const { assertGerante } = await import("./reservation.server");
  await assertGerante(context as never);
}

export const adminGalerie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await gerante(context);
    const { data, error } = await context.supabase
      .from("galerie_photos")
      .select(COLONNES)
      .order("ordre", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => versPhoto(r, urlSupabase()));
  });

/** Enregistre une photo dont les fichiers viennent d'être déposés dans le stockage. */
export const adminAjouterPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => photoAjoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    await gerante(context);
    const { data: dernier } = await context.supabase
      .from("galerie_photos")
      .select("ordre")
      .order("ordre", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await context.supabase.from("galerie_photos").insert({
      chemin: data.chemin,
      titre: data.titre,
      categorie: data.categorie,
      ordre: (dernier?.ordre ?? 0) + 1,
      visible: true,
      accueil: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminModifierPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => photoModifSchema.parse(d))
  .handler(async ({ data, context }) => {
    await gerante(context);
    const { id, banniere, ...champs } = data;
    if (banniere) {
      // Une seule bannière : l'ancienne est d'abord retirée. La bannière est
      // toujours visible (sinon les visiteuses ne pourraient pas la voir).
      const { error: e1 } = await context.supabase
        .from("galerie_photos")
        .update({ banniere: false })
        .eq("banniere", true)
        .neq("id", id);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await context.supabase
        .from("galerie_photos")
        .update({ ...champs, banniere: true, visible: true })
        .eq("id", id);
      if (e2) throw new Error(e2.message);
      return { ok: true };
    }
    // Masquer la bannière la retirerait du site : interdit tant qu'elle est la bannière.
    if (champs.visible === false) {
      const { data: actuelle } = await context.supabase
        .from("galerie_photos")
        .select("banniere")
        .eq("id", id)
        .maybeSingle();
      if (actuelle?.banniere) {
        throw new Error(
          "Choisissez d'abord une autre photo pour la bannière avant de masquer celle-ci.",
        );
      }
    }
    const { error } = await context.supabase.from("galerie_photos").update(champs).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Nouvel ordre d'affichage : la liste complète des identifiants, dans l'ordre voulu. */
export const adminOrdreGalerie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ordreGalerieSchema.parse(d))
  .handler(async ({ data, context }) => {
    await gerante(context);
    const res = await Promise.all(
      data.ids.map((id, i) =>
        context.supabase
          .from("galerie_photos")
          .update({ ordre: i + 1 })
          .eq("id", id),
      ),
    );
    const erreur = res.find((r) => r.error)?.error;
    if (erreur) throw new Error(erreur.message);
    return { ok: true };
  });

export const adminSupprimerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await gerante(context);
    const { data: row } = await context.supabase
      .from("galerie_photos")
      .select("chemin")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.chemin) {
      // Fichiers déposés depuis l'admin : supprimés du stockage.
      await context.supabase.storage
        .from("galerie")
        .remove([`${row.chemin}/grand.webp`, `${row.chemin}/petit.webp`]);
    }
    const { error } = await context.supabase.from("galerie_photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
