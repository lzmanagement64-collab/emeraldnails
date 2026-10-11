-- ============================================================
-- BANNIÈRE : FRENCH BLANC LAITEUX ; FLEURS 3D EN 3ᵉ RÉALISATION ;
-- PHOTO BORDEAUX STILETTO RETIRÉE
-- Les fichiers ont été renommés selon leur nouvelle place :
--   accueil-3-french-blanc-laiteux      -> banniere-french-blanc-laiteux
--   banniere-fleurs-3d-blanc-creme-or   -> accueil-3-nailart-fleurs-3d-blanc-creme-or
-- Rejouable sans danger.
-- ============================================================
-- L'ancienne bannière d'abord (une seule bannière à la fois)
UPDATE public.galerie_photos
SET url_statique = '/photos/realisations/accueil-3-nailart-fleurs-3d-blanc-creme-or',
    banniere = false, accueil = true, visible = true, ordre = 3
WHERE url_statique = '/photos/realisations/banniere-fleurs-3d-blanc-creme-or';

UPDATE public.galerie_photos
SET url_statique = '/photos/realisations/banniere-french-blanc-laiteux',
    banniere = true, accueil = false, visible = true, ordre = 0
WHERE url_statique = '/photos/realisations/accueil-3-french-blanc-laiteux';

DELETE FROM public.galerie_photos
WHERE url_statique = '/photos/realisations/galerie-couleur-bordeaux-stiletto';
