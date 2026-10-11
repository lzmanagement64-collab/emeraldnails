-- ============================================================
-- NOUVELLES PHOTOS DE RÉALISATIONS + BANNIÈRE CHOISIE DANS L'ADMIN
-- - galerie_photos.banniere : photo de la bannière d'accueil (une seule).
-- - galerie_photos.texte_alt : texte alternatif précis (référencement,
--   lecteurs d'écran). Vide = titre + catégorie.
-- - Les photos de démonstration d'origine (hébergées par Lovable) sont
--   retirées de la galerie ; les 17 photos de réalisations fournies sont
--   ajoutées (fichiers WebP dans public/photos/realisations, 3 tailles).
-- Rejouable sans danger.
-- ============================================================
ALTER TABLE public.galerie_photos ADD COLUMN IF NOT EXISTS banniere boolean NOT NULL DEFAULT false;
ALTER TABLE public.galerie_photos ADD COLUMN IF NOT EXISTS texte_alt text NOT NULL DEFAULT ''
  CHECK (length(texte_alt) <= 250);
-- Une seule bannière à la fois
CREATE UNIQUE INDEX IF NOT EXISTS galerie_photos_une_banniere
  ON public.galerie_photos (banniere) WHERE banniere;

-- Anciennes photos de démonstration (adresses /__l5e/… de Lovable)
DELETE FROM public.galerie_photos WHERE url_statique LIKE '/__l5e/%';

INSERT INTO public.galerie_photos (titre, categorie, url_statique, ordre, visible, accueil, banniere, texte_alt)
SELECT v.titre, v.categorie, v.url, v.ordre, true, v.accueil, v.banniere, v.alt
FROM (VALUES
  ('Fleurs 3D blanc crème · touches dorées', 'nail-art', '/photos/realisations/banniere-fleurs-3d-blanc-creme-or', 0, false, true,
   'Ongles longs amande nude ornés de fleurs 3D blanc crème et de détails dorés, réalisés par Emerald Beauty, prothésiste ongulaire à Lons'),
  ('French blanche · fleurs bleues', 'french', '/photos/realisations/accueil-1-french-fleurs-bleues', 1, true, false,
   'Ongles amande en french blanche avec fleurs bleues peintes à la main, réalisation Emerald Beauty à Lons près de Pau'),
  ('Nude & rose · fleurs 3D et bijoux', 'nail-art', '/photos/realisations/accueil-2-nailart-rose-3d-bijoux', 2, true, false,
   'Nail art sur ongles amande nude : pointes roses, fleurs 3D roses et bijoux dorés, par Emerald Beauty à Lons'),
  ('Blanc laiteux · amande', 'french', '/photos/realisations/accueil-3-french-blanc-laiteux', 3, true, false,
   'Ongles amande blanc laiteux brillant, pose réalisée par Emerald Beauty, prothésiste ongulaire à Lons'),
  ('Corail · fleurs 3D', 'nail-art', '/photos/realisations/accueil-4-nailart-corail-fleurs-3d', 4, true, false,
   'Ongles amande corail et orange avec fleurs 3D et détails dorés, nail art Emerald Beauty à Lons'),
  ('French blanche · carré', 'french', '/photos/realisations/galerie-french-carree-blanche', 10, false, false,
   'French manucure blanche sur ongles longs forme carrée, réalisée par Emerald Beauty à Lons'),
  ('French rose · paillettes argentées', 'french', '/photos/realisations/galerie-french-paillettes-rose-argent', 11, false, false,
   'Ongles carrés rose nude avec french à paillettes argentées, Emerald Beauty, prothésiste ongulaire à Lons'),
  ('French rose classique', 'french', '/photos/realisations/galerie-french-rose-classique', 12, false, false,
   'French classique blanche sur base rose, ongles amande, réalisation Emerald Beauty à Lons'),
  ('Fleurs bleues · carré', 'nail-art', '/photos/realisations/galerie-nailart-fleurs-bleues-carre', 13, false, false,
   'Ongles longs carrés en french blanche décorés de fleurs bleues peintes à la main, nail art Emerald Beauty'),
  ('Nude · fleur 3D', 'nail-art', '/photos/realisations/galerie-nailart-french-nude-fleur-3d', 14, false, false,
   'Ongles amande nude avec une fleur 3D délicate, réalisation Emerald Beauty, prothésiste ongulaire à Lons'),
  ('Écaille de tortue', 'nail-art', '/photos/realisations/galerie-nailart-ecaille-tortue', 15, false, false,
   'Ongles amande nude avec pointes effet écaille de tortue, nail art Emerald Beauty à Lons'),
  ('Dégradé orange & jaune · fleur rose', 'nail-art', '/photos/realisations/galerie-nailart-orange-jaune-fleur-rose', 16, false, false,
   'Ongles amande en dégradé orange et jaune avec une fleur rose, nail art Emerald Beauty à Lons'),
  ('Stiletto rouge & jaune · strass', 'nail-art', '/photos/realisations/galerie-nailart-stiletto-rouge-jaune-strass', 17, false, false,
   'Ongles stiletto longs rouges et jaunes avec motifs, strass et chaînes dorées, nail art Emerald Beauty'),
  ('Stiletto violet & jaune · motifs', 'nail-art', '/photos/realisations/galerie-nailart-stiletto-violet-jaune', 18, false, false,
   'Ongles stiletto longs violets et jaunes avec pois et motifs zèbre, nail art Emerald Beauty à Lons'),
  ('Zèbre bleu & jaune', 'nail-art', '/photos/realisations/galerie-nailart-stiletto-zebre-bleu-jaune', 19, false, false,
   'Ongles amande nude avec pointes zèbre blanc, bleu ciel et jaune, nail art Emerald Beauty à Lons'),
  ('Rouge cerise', 'couleur', '/photos/realisations/galerie-couleur-rouge-cerise', 20, false, false,
   'Ongles amande rouge cerise brillant, couleur unie réalisée par Emerald Beauty, prothésiste ongulaire à Lons'),
  ('Bordeaux · stiletto', 'couleur', '/photos/realisations/galerie-couleur-bordeaux-stiletto', 21, false, false,
   'Ongles stiletto longs bordeaux profond et brillants, réalisation Emerald Beauty à Lons')
) AS v(titre, categorie, url, ordre, accueil, banniere, alt)
WHERE NOT EXISTS (SELECT 1 FROM public.galerie_photos g WHERE g.url_statique = v.url);
