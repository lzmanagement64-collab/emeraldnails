-- ============================================================
-- PRESTATIONS — ordre d'affichage, nouvelles prestations.
-- Aucune prestation supprimée, aucun prix existant modifié.
-- Rejouable sans danger : chaque ligne vérifie l'état avant d'agir.
-- ============================================================

-- 1. Semi-permanent : l'ancienne « Ongles naturels — beauté des mains »
--    (description : finition vernis semi-permanent), renommée. Prix et durée conservés.
UPDATE public.prestations SET nom = 'Semi-permanent', ordre = 1
WHERE nom IN ('Ongles naturels — beauté des mains', 'Semi-permanent');

-- 2. Dépose semi-permanent : 10 €, 30 min (nouvelle)
INSERT INTO public.prestations (nom, description, duree_minutes, prix, ordre)
SELECT 'Dépose semi-permanent', 'Retrait du vernis semi-permanent en douceur, dans le respect de l''ongle naturel.', 30, 10, 2
WHERE NOT EXISTS (SELECT 1 FROM public.prestations WHERE nom = 'Dépose semi-permanent');

-- 3. Renforcement : l'ancienne « Ongles naturels — renfort gel », renommée. Prix et durée conservés.
UPDATE public.prestations SET nom = 'Renforcement', ordre = 3
WHERE nom IN ('Ongles naturels — renfort gel', 'Renforcement');

-- 4. Remplissage renforcement : 35 € (tarif de l'ancien catalogue du site), 75 min (nouvelle)
INSERT INTO public.prestations (nom, description, duree_minutes, prix, ordre)
SELECT 'Remplissage renforcement', 'Entretien du renforcement, à prévoir toutes les 3 à 4 semaines.', 75, 35, 4
WHERE NOT EXISTS (SELECT 1 FROM public.prestations WHERE nom = 'Remplissage renforcement');

-- 5. Dépose renforcement : 15 €, 30 min (nouvelle)
INSERT INTO public.prestations (nom, description, duree_minutes, prix, ordre)
SELECT 'Dépose renforcement', 'Retrait du renforcement en douceur, dans le respect de l''ongle naturel.', 30, 15, 5
WHERE NOT EXISTS (SELECT 1 FROM public.prestations WHERE nom = 'Dépose renforcement');

-- 6. Manucure homme : 30 €, 30 min (nouvelle)
INSERT INTO public.prestations (nom, description, duree_minutes, prix, ordre)
SELECT 'Manucure homme', 'Soin des cuticules, mise en forme et finition naturelle.', 30, 30, 6
WHERE NOT EXISTS (SELECT 1 FROM public.prestations WHERE nom = 'Manucure homme');

-- Puis les autres prestations existantes, prix inchangés.
UPDATE public.prestations SET ordre = 7  WHERE nom = 'Extension gel — pose complète';
UPDATE public.prestations SET ordre = 8  WHERE nom = 'Extension gel — remplissage';
UPDATE public.prestations SET ordre = 9  WHERE nom = 'Gel-X — pose complète';
UPDATE public.prestations SET ordre = 10 WHERE nom = 'Nail art simple';
UPDATE public.prestations SET ordre = 11 WHERE nom = 'Nail art avancé';
