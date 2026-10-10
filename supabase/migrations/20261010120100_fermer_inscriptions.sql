-- ============================================================
-- SÉCURITÉ — création de comptes fermée.
-- Le seul compte utile (emeraldnails@outlook.fr) existe déjà.
-- Toute nouvelle inscription est refusée par la base elle-même,
-- même si quelqu'un contourne le site.
--
-- Pour créer un compte un jour (ex. nouvelle adresse de gestion),
-- supprimer temporairement le déclencheur :
--   DROP TRIGGER bloquer_inscriptions ON auth.users;
-- Script séparé et rejouable : s'il échouait, le reste de la sécurité
-- (migration précédente) resterait appliqué.
-- ============================================================
CREATE OR REPLACE FUNCTION public.bloquer_inscriptions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Les inscriptions sont fermées sur ce site.';
END;
$$;

DROP TRIGGER IF EXISTS bloquer_inscriptions ON auth.users;
CREATE TRIGGER bloquer_inscriptions
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bloquer_inscriptions();
