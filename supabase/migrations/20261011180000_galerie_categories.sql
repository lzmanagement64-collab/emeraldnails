-- ============================================================
-- CATÉGORIES DE PRESTATIONS + GALERIE GÉRÉE DEPUIS L'ADMIN
-- Ajouts uniquement : aucune donnée supprimée. Rejouable sans danger.
-- ============================================================

-- 1) Catégorie de chaque prestation (grille de prix par catégorie,
--    modifiable dans l'admin). Les prestations existantes sont rangées
--    d'après leur nom ; une prestation inconnue reste dans « Autres ».
ALTER TABLE public.prestations
  ADD COLUMN IF NOT EXISTS categorie text NOT NULL DEFAULT 'Autres';

UPDATE public.prestations SET categorie = 'Semi-permanent'
  WHERE categorie = 'Autres' AND nom = 'Semi-permanent';
UPDATE public.prestations SET categorie = 'Renforcement'
  WHERE categorie = 'Autres' AND nom IN ('Renforcement', 'Remplissage renforcement');
UPDATE public.prestations SET categorie = 'Déposes'
  WHERE categorie = 'Autres' AND nom IN ('Dépose semi-permanent', 'Dépose renforcement');
UPDATE public.prestations SET categorie = 'Homme'
  WHERE categorie = 'Autres' AND nom = 'Manucure homme';
UPDATE public.prestations SET categorie = 'Extension gel'
  WHERE categorie = 'Autres' AND nom LIKE 'Extension gel%';
UPDATE public.prestations SET categorie = 'Gel-X'
  WHERE categorie = 'Autres' AND nom LIKE 'Gel-X%';
UPDATE public.prestations SET categorie = 'Nail art'
  WHERE categorie = 'Autres' AND nom LIKE 'Nail art%';

-- 2) Photos de la galerie
CREATE TABLE IF NOT EXISTS public.galerie_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL DEFAULT '' CHECK (length(titre) <= 120),
  categorie text NOT NULL DEFAULT 'nail-art'
    CHECK (categorie IN ('nude', 'french', 'nail-art', 'couleur', 'long', 'court')),
  -- Photo ajoutée depuis l'admin : dossier dans le stockage « galerie »
  -- (deux tailles allégées : grand.webp et petit.webp).
  chemin text,
  -- Photo d'origine du site (hébergée par Lovable).
  url_statique text,
  ordre integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  accueil boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT galerie_photos_source CHECK (chemin IS NOT NULL OR url_statique IS NOT NULL)
);

ALTER TABLE public.galerie_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.galerie_photos FROM anon, authenticated;
GRANT SELECT ON public.galerie_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galerie_photos TO authenticated;
GRANT ALL ON public.galerie_photos TO service_role;

DROP POLICY IF EXISTS "Galerie visible publiquement" ON public.galerie_photos;
CREATE POLICY "Galerie visible publiquement"
  ON public.galerie_photos FOR SELECT TO anon, authenticated
  USING (visible = true);
DROP POLICY IF EXISTS "Gerante gere la galerie" ON public.galerie_photos;
CREATE POLICY "Gerante gere la galerie"
  ON public.galerie_photos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

DROP TRIGGER IF EXISTS galerie_photos_updated_at ON public.galerie_photos;
CREATE TRIGGER galerie_photos_updated_at BEFORE UPDATE ON public.galerie_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Photos d'origine du site, reprises dans la galerie (une seule fois).
-- Le doublon « French lilas · fleurs violettes » n'est pas repris.
-- IMG_1972 à IMG_1980 : jamais affichées jusqu'ici, ajoutées MASQUÉES
-- pour que la gérante les regarde et décide (titre et catégorie à choisir).
INSERT INTO public.galerie_photos (titre, categorie, url_statique, ordre, visible, accueil)
SELECT v.titre, v.categorie, v.url, v.ordre, v.visible, v.accueil
FROM (VALUES
  ('French lilas · floral violet', 'french', '/__l5e/assets-v1/bf81a9f7-3de5-481b-8c07-84bff26c1d3b/nails-lilas-fleurs.png', 1, true, true),
  ('Milky lilac · finition glossy', 'nude', '/__l5e/assets-v1/f6b77839-147d-4537-97f4-1b4c2a113ad8/nails-lilas-milky.png', 2, true, true),
  ('Vert sauge · léopard doré', 'nail-art', '/__l5e/assets-v1/530feef6-2c49-4966-b2cd-ed350baf39c1/nails-vert-leopard.png', 3, true, true),
  ('Blanc laiteux · fleur 3D', 'nail-art', '/__l5e/assets-v1/39337e50-e44a-47ab-b285-3921212e941e/nails-white-flower.png', 4, true, true),
  ('French blanche · fleurs bleues peintes', 'french', '/__l5e/assets-v1/15a4715e-ad38-44ae-a909-e0878824e1ff/IMG_2238.jpg', 5, true, true),
  ('Carré long · floral bleu dégradé', 'nail-art', '/__l5e/assets-v1/4e45ecd3-fd33-4fee-979d-e2509cc5d5a8/IMG_2239.jpg', 6, true, true),
  ('Bleu roi · fleurs 3D & pois jaunes', 'couleur', '/__l5e/assets-v1/950fce92-5f24-4231-b4ce-424623f6c9dc/IMG_2240.jpg', 7, true, false),
  ('Rose & orange · étoiles XL', 'couleur', '/__l5e/assets-v1/3c76b8a1-42ab-4887-9bd1-d2f9be821835/IMG_2241.jpg', 8, true, false),
  ('', 'nail-art', '/__l5e/assets-v1/d9caf572-18f9-40a4-a293-abb027166195/IMG_1972.png', 20, false, false),
  ('', 'nail-art', '/__l5e/assets-v1/50087857-3d3a-45eb-9d69-89ee62970ff4/IMG_1973.png', 21, false, false),
  ('', 'nail-art', '/__l5e/assets-v1/99299540-8682-4d06-8666-10a3750e0171/IMG_1974.png', 22, false, false),
  ('', 'nail-art', '/__l5e/assets-v1/822c9217-4c16-4f24-b9b8-9a23aac338a4/IMG_1975.png', 23, false, false),
  ('', 'nail-art', '/__l5e/assets-v1/670873ed-3595-4ea6-bcea-85c522c8f699/IMG_1980.png', 24, false, false)
) AS v(titre, categorie, url, ordre, visible, accueil)
WHERE NOT EXISTS (SELECT 1 FROM public.galerie_photos g WHERE g.url_statique = v.url);

-- 3) Stockage des photos : lecture publique, écriture réservée à la gérante.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('galerie', 'galerie', true, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Galerie : la gerante lit" ON storage.objects;
CREATE POLICY "Galerie : la gerante lit" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'galerie' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')));
DROP POLICY IF EXISTS "Galerie : la gerante ajoute" ON storage.objects;
CREATE POLICY "Galerie : la gerante ajoute" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'galerie' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')));
DROP POLICY IF EXISTS "Galerie : la gerante remplace" ON storage.objects;
CREATE POLICY "Galerie : la gerante remplace" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'galerie' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')));
DROP POLICY IF EXISTS "Galerie : la gerante supprime" ON storage.objects;
CREATE POLICY "Galerie : la gerante supprime" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'galerie' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')));
