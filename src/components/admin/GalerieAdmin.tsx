import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Home,
  ImagePlus,
  Loader2,
  PanelTop,
  Trash2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { CATEGORIES_GALERIE, type PhotoGalerie } from "@/lib/galerie";
import { preparerPhoto } from "@/lib/compression-image";
import {
  adminAjouterPhoto,
  adminGalerie,
  adminModifierPhoto,
  adminOrdreGalerie,
  adminSupprimerPhoto,
} from "@/lib/galerie.functions";

const champ = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

/**
 * Onglet « Galerie » de l'admin : ajout depuis le téléphone (photos allégées
 * automatiquement), titre, texte alternatif, catégorie, ordre, choix de la
 * bannière et des photos de l'accueil, masquage et suppression.
 */
export function GalerieAdmin() {
  const charger = useServerFn(adminGalerie);
  const ajouter = useServerFn(adminAjouterPhoto);
  const modifier = useServerFn(adminModifierPhoto);
  const ordonner = useServerFn(adminOrdreGalerie);
  const supprimer = useServerFn(adminSupprimerPhoto);

  const [photos, setPhotos] = useState<PhotoGalerie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [categorieAjout, setCategorieAjout] = useState<string>("nail-art");
  const entree = useRef<HTMLInputElement>(null);

  const rafraichir = useCallback(async () => {
    try {
      setPhotos((await charger({})) as PhotoGalerie[]);
    } catch (e) {
      toast.error((e as Error).message || "Impossible de charger la galerie.");
    } finally {
      setChargement(false);
    }
  }, [charger]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  const envoyer = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    const liste = [...fichiers];
    try {
      for (const [i, fichier] of liste.entries()) {
        setEnvoi(`Photo ${i + 1} sur ${liste.length} : préparation…`);
        const { grand, petit } = await preparerPhoto(fichier);
        const dossier = crypto.randomUUID();
        setEnvoi(`Photo ${i + 1} sur ${liste.length} : envoi…`);
        for (const [nom, blob] of [
          ["grand", grand],
          ["petit", petit],
        ] as const) {
          const { error } = await supabase.storage
            .from("galerie")
            .upload(`${dossier}/${nom}.webp`, blob, {
              contentType: blob.type,
              cacheControl: "31536000",
              upsert: false,
            });
          if (error) throw new Error(`Envoi impossible : ${error.message}`);
        }
        await ajouter({ data: { chemin: dossier, titre: "", categorie: categorieAjout as never } });
      }
      toast.success(liste.length > 1 ? `${liste.length} photos ajoutées.` : "Photo ajoutée.");
    } catch (e) {
      toast.error((e as Error).message || "Envoi impossible.");
    } finally {
      setEnvoi(null);
      if (entree.current) entree.current.value = "";
      await rafraichir();
    }
  };

  const maj = async (id: string, champs: Partial<PhotoGalerie>) => {
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...champs } : p)));
    try {
      await modifier({ data: { id, ...champs } as never });
    } catch (e) {
      toast.error((e as Error).message || "Modification impossible.");
      await rafraichir();
    }
  };

  const deplacer = async (index: number, sens: -1 | 1) => {
    const cible = index + sens;
    if (cible < 0 || cible >= photos.length) return;
    const nouvelles = [...photos];
    [nouvelles[index], nouvelles[cible]] = [nouvelles[cible], nouvelles[index]];
    setPhotos(nouvelles);
    try {
      await ordonner({ data: { ids: nouvelles.map((p) => p.id) } });
    } catch (e) {
      toast.error((e as Error).message || "Réorganisation impossible.");
      await rafraichir();
    }
  };

  /** Nouvelle photo de bannière (une seule : l'ancienne est retirée par le serveur). */
  const choisirBanniere = async (id: string) => {
    setPhotos((ps) =>
      ps.map((p) => ({ ...p, banniere: p.id === id, visible: p.id === id || p.visible })),
    );
    try {
      await modifier({ data: { id, banniere: true } });
      toast.success("Bannière d'accueil mise à jour.");
    } catch (e) {
      toast.error((e as Error).message || "Modification impossible.");
      await rafraichir();
    }
  };

  const majAlt = async (id: string, texte: string) => {
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, texteAlt: texte } : p)));
    try {
      await modifier({ data: { id, texte_alt: texte } });
    } catch (e) {
      toast.error((e as Error).message || "Modification impossible.");
      await rafraichir();
    }
  };

  const effacer = async (p: PhotoGalerie) => {
    if (
      !window.confirm(`Supprimer définitivement cette photo${p.titre ? ` « ${p.titre} »` : ""} ?`)
    )
      return;
    try {
      await supprimer({ data: { id: p.id } });
      setPhotos((ps) => ps.filter((x) => x.id !== p.id));
      toast.success("Photo supprimée.");
    } catch (e) {
      toast.error((e as Error).message || "Suppression impossible.");
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl text-ink">Ajouter des photos</h2>
        <p className="mt-1 text-sm text-taupe">
          Choisissez une ou plusieurs photos dans votre téléphone. Elles sont allégées
          automatiquement avant l'envoi, puis apparaissent aussitôt sur le site.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={categorieAjout}
            onChange={(e) => setCategorieAjout(e.target.value)}
            className={cn(champ, "sm:w-56")}
            aria-label="Catégorie des nouvelles photos"
          >
            {CATEGORIES_GALERIE.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <label
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-porcelain",
              envoi && "pointer-events-none opacity-60",
            )}
          >
            {envoi ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {envoi ?? "Choisir des photos"}
            <input
              ref={entree}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => envoyer(e.target.files)}
            />
          </label>
        </div>
      </section>

      {chargement ? (
        <p className="flex items-center gap-2 text-sm text-taupe">
          <Loader2 className="size-4 animate-spin" /> Chargement…
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((p, i) => (
            <li
              key={p.id}
              className={cn(
                "overflow-hidden rounded-3xl border border-border bg-card",
                !p.visible && "opacity-70",
              )}
            >
              <div className="relative aspect-[4/5] bg-linen">
                <img
                  src={p.vignette}
                  alt={p.titre}
                  loading="lazy"
                  className="size-full object-cover"
                />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                  {p.banniere && (
                    <span className="rounded-full bg-emerald px-2.5 py-1 text-[11px] text-porcelain">
                      Bannière
                    </span>
                  )}
                  {p.accueil && (
                    <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[11px] text-porcelain">
                      Accueil
                    </span>
                  )}
                  {!p.visible && (
                    <span className="rounded-full bg-porcelain/90 px-2.5 py-1 text-[11px] text-ink">
                      Masquée
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <input
                  defaultValue={p.titre}
                  placeholder="Titre (ex. French lilas)"
                  maxLength={120}
                  onBlur={(e) => e.target.value !== p.titre && maj(p.id, { titre: e.target.value })}
                  className={champ}
                  aria-label="Titre de la photo"
                />
                <textarea
                  defaultValue={p.texteAlt}
                  placeholder="Description pour Google (facultatif) : ex. Ongles amande en french blanche avec fleurs bleues"
                  maxLength={250}
                  rows={2}
                  onBlur={(e) => e.target.value !== p.texteAlt && majAlt(p.id, e.target.value)}
                  className={cn(champ, "resize-none")}
                  aria-label="Description de la photo pour Google et les lecteurs d'écran"
                />
                <select
                  value={p.categorie}
                  onChange={(e) => maj(p.id, { categorie: e.target.value })}
                  className={champ}
                  aria-label="Catégorie de la photo"
                >
                  {CATEGORIES_GALERIE.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-2">
                  <BoutonIcone
                    titre="Monter"
                    onClick={() => deplacer(i, -1)}
                    desactive={i === 0}
                    icone={<ArrowUp className="size-4" />}
                  />
                  <BoutonIcone
                    titre="Descendre"
                    onClick={() => deplacer(i, 1)}
                    desactive={i === photos.length - 1}
                    icone={<ArrowDown className="size-4" />}
                  />
                  <BoutonIcone
                    titre={p.banniere ? "Photo de la bannière" : "Choisir comme bannière d'accueil"}
                    onClick={() => !p.banniere && choisirBanniere(p.id)}
                    actif={p.banniere}
                    icone={<PanelTop className="size-4" />}
                  />
                  <BoutonIcone
                    titre={p.accueil ? "Retirer de l'accueil" : "Mettre à l'accueil"}
                    onClick={() => maj(p.id, { accueil: !p.accueil })}
                    actif={p.accueil}
                    icone={<Home className="size-4" />}
                  />
                  <BoutonIcone
                    titre={p.visible ? "Masquer du site" : "Afficher sur le site"}
                    onClick={() => maj(p.id, { visible: !p.visible })}
                    actif={!p.visible}
                    icone={p.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  />
                  <span className="flex-1" />
                  <BoutonIcone
                    titre="Supprimer"
                    onClick={() => effacer(p)}
                    icone={<Trash2 className="size-4 text-bordeaux" />}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-taupe">
        « Bannière » (icône fenêtre) : la grande photo en haut de l'accueil, une seule à la fois. «
        Accueil » (icône maison) : les photos de la section « Réalisations » de l'accueil, dans
        l'ordre de la liste. « Masquée » : la photo reste ici mais n'apparaît pas sur le site. La
        description aide Google à comprendre la photo ; sans description, le titre est utilisé.
      </p>
    </div>
  );
}

function BoutonIcone({
  titre,
  onClick,
  icone,
  desactive,
  actif,
}: {
  titre: string;
  onClick: () => void;
  icone: React.ReactNode;
  desactive?: boolean;
  actif?: boolean;
}) {
  return (
    <button
      type="button"
      title={titre}
      aria-label={titre}
      disabled={desactive}
      onClick={onClick}
      className={cn(
        "grid size-10 place-items-center rounded-full border transition-colors disabled:opacity-30",
        actif
          ? "border-ink bg-ink text-porcelain"
          : "border-border bg-background text-ink hover:border-ink/50",
      )}
    >
      {icone}
    </button>
  );
}
