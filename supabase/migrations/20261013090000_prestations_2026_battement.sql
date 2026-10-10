-- ============================================================
-- NOUVELLE CARTE DES PRESTATIONS + TEMPS DE BATTEMENT
-- - prestations.sur_devis : prix fixé avec Maria (affiché « Sur devis »,
--   compté dans la durée mais pas dans le total ni dans l'acompte).
-- - prestations.en_option : s'ajoute à une autre prestation, ne se
--   réserve pas seule (nail art).
-- - reglages.battement_minutes : temps entre deux clientes (10 min par
--   défaut), réglable dans l'admin.
-- - reservations.fin_bloquee : fin du rendez-vous + battement, calculée
--   par la base. La règle anti-chevauchement porte désormais sur
--   [début, fin_bloquee) : deux clientes ne peuvent jamais se suivre
--   sans le battement, même en réservant à la même seconde.
-- - Créneaux : durée TOTALE + battement, pauses et absences respectées ;
--   un créneau est aussi proposé pile à la fin d'un rendez-vous + battement.
-- Aucune réservation supprimée ni modifiée (hors calcul de fin_bloquee).
-- Les prestations retirées de la carte sont MASQUÉES, pas supprimées.
-- Rejouable sans danger.
-- ============================================================

-- 1) Nouveaux réglages des prestations
ALTER TABLE public.prestations ADD COLUMN IF NOT EXISTS sur_devis boolean NOT NULL DEFAULT false;
ALTER TABLE public.prestations ADD COLUMN IF NOT EXISTS en_option boolean NOT NULL DEFAULT false;

-- 2) Réglages généraux (une seule ligne)
CREATE TABLE IF NOT EXISTS public.reglages (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  battement_minutes integer NOT NULL DEFAULT 10 CHECK (battement_minutes BETWEEN 0 AND 60),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.reglages (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.reglages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reglages FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.reglages TO authenticated;
GRANT ALL ON public.reglages TO service_role;
DROP POLICY IF EXISTS "Gerante lit les reglages" ON public.reglages;
CREATE POLICY "Gerante lit les reglages" ON public.reglages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "Gerante modifie les reglages" ON public.reglages;
CREATE POLICY "Gerante modifie les reglages" ON public.reglages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

DROP TRIGGER IF EXISTS reglages_updated_at ON public.reglages;
CREATE TRIGGER reglages_updated_at BEFORE UPDATE ON public.reglages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.battement_actuel()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT battement_minutes FROM public.reglages WHERE id = 1), 10);
$$;
REVOKE ALL ON FUNCTION public.battement_actuel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.battement_actuel() TO service_role;

-- 3) Fin bloquée (fin + battement), calculée par la base
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS fin_bloquee timestamptz;

CREATE OR REPLACE FUNCTION public.calculer_fin_bloquee()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.date_fin IS DISTINCT FROM OLD.date_fin
     OR NEW.date_debut IS DISTINCT FROM OLD.date_debut OR NEW.fin_bloquee IS NULL THEN
    NEW.fin_bloquee := NEW.date_fin + make_interval(mins => public.battement_actuel());
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.calculer_fin_bloquee() FROM PUBLIC;

DROP TRIGGER IF EXISTS reservations_fin_bloquee ON public.reservations;
CREATE TRIGGER reservations_fin_bloquee BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.calculer_fin_bloquee();

-- Rendez-vous existants : fin + battement actuel
UPDATE public.reservations
  SET fin_bloquee = date_fin + make_interval(mins => public.battement_actuel())
  WHERE fin_bloquee IS NULL;
ALTER TABLE public.reservations ALTER COLUMN fin_bloquee SET NOT NULL;

-- Règle anti-chevauchement, battement compris
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_pas_de_chevauchement;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_pas_de_chevauchement
  EXCLUDE USING gist (tstzrange(date_debut, fin_bloquee) WITH &&) WHERE (statut <> 'annulee');

-- 4) Créneaux libres pour une durée totale
CREATE OR REPLACE FUNCTION public.get_creneaux_disponibles_duree(
  date_recherche date,
  p_duree integer
)
RETURNS TABLE (heure_debut time)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h record;
  b int;
  ouverture timestamptz;
  fermeture timestamptz;
  pause_d timestamptz;
  pause_f timestamptz;
BEGIN
  IF p_duree IS NULL OR p_duree < 5 OR p_duree > 720 THEN RETURN; END IF;
  IF date_recherche > (now() AT TIME ZONE 'Europe/Paris')::date + 60 THEN RETURN; END IF;

  SELECT * INTO h FROM public.horaires_ouverture
  WHERE jour_semaine = EXTRACT(DOW FROM date_recherche)::int AND ferme = false;
  IF h IS NULL THEN RETURN; END IF;

  b := public.battement_actuel();
  ouverture := (date_recherche + h.heure_debut) AT TIME ZONE 'Europe/Paris';
  fermeture := (date_recherche + h.heure_fin) AT TIME ZONE 'Europe/Paris';
  IF h.pause_debut IS NOT NULL AND h.pause_fin IS NOT NULL THEN
    pause_d := (date_recherche + h.pause_debut) AT TIME ZONE 'Europe/Paris';
    pause_f := (date_recherche + h.pause_fin) AT TIME ZONE 'Europe/Paris';
  END IF;

  RETURN QUERY
  WITH occupe AS (
    -- Rendez-vous qui comptent : non annulés, hors réservations provisoires expirées.
    -- Battement : celui enregistré avec le rendez-vous, ou le réglage actuel s'il est plus long.
    SELECT r.date_debut, greatest(r.fin_bloquee, r.date_fin + make_interval(mins => b)) AS fin_bloquee
    FROM public.reservations r
    WHERE r.statut <> 'annulee'
      AND NOT (r.acompte_statut = 'en_attente' AND coalesce(r.acompte_expire_le, 'infinity') < now())
      AND greatest(r.fin_bloquee, r.date_fin + make_interval(mins => b)) > ouverture
      AND r.date_debut < fermeture
  ),
  candidats AS (
    -- Toutes les 15 min…
    SELECT g AS debut FROM generate_series(ouverture, fermeture, interval '15 minutes') g
    -- … et pile à la fin d'un rendez-vous (battement compris), d'une absence ou de la pause
    UNION SELECT o.fin_bloquee FROM occupe o
    UNION SELECT i.date_fin FROM public.indisponibilites i
      WHERE i.date_fin > ouverture AND i.date_fin < fermeture
    UNION SELECT pause_f WHERE pause_f IS NOT NULL
  )
  SELECT (c.debut AT TIME ZONE 'Europe/Paris')::time
  FROM candidats c
  WHERE c.debut >= ouverture
    AND c.debut + make_interval(mins => p_duree) <= fermeture
    AND c.debut > now() + interval '12 hours'
    -- pause déjeuner (prestation elle-même)
    AND NOT (pause_d IS NOT NULL
      AND tstzrange(c.debut, c.debut + make_interval(mins => p_duree)) && tstzrange(pause_d, pause_f))
    -- absences saisies dans l'admin
    AND NOT EXISTS (
      SELECT 1 FROM public.indisponibilites i
      WHERE tstzrange(i.date_debut, i.date_fin)
        && tstzrange(c.debut, c.debut + make_interval(mins => p_duree)))
    -- autres rendez-vous : durée totale + battement de part et d'autre
    AND NOT EXISTS (
      SELECT 1 FROM occupe o
      WHERE tstzrange(o.date_debut, o.fin_bloquee)
        && tstzrange(c.debut, c.debut + make_interval(mins => p_duree + b)))
  ORDER BY 1;
END; $$;

REVOKE ALL ON FUNCTION public.get_creneaux_disponibles_duree(date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creneaux_disponibles_duree(date, integer) TO anon, authenticated, service_role;

-- Ancienne fonction (une seule prestation) : mêmes règles.
CREATE OR REPLACE FUNCTION public.get_creneaux_disponibles(date_recherche date, prestation_id uuid)
RETURNS TABLE (heure_debut time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.heure_debut FROM public.get_creneaux_disponibles_duree(
    date_recherche,
    (SELECT p.duree_minutes FROM public.prestations p WHERE p.id = prestation_id AND p.actif = true)
  ) c;
$$;
REVOKE ALL ON FUNCTION public.get_creneaux_disponibles(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creneaux_disponibles(date, uuid) TO anon, authenticated, service_role;

-- 5) Nouvelle carte (identifiants existants conservés : les réservations
--    passées gardent leur prestation)
UPDATE public.prestations SET nom = 'Semi-permanent', categorie = 'Ongles naturels', prix = 30, duree_minutes = 40, ordre = 1, actif = true, sur_devis = false, en_option = false
  WHERE id = 'cd3df56f-763a-45b9-a378-2cef4226f7fb';
UPDATE public.prestations SET nom = 'Dépose semi-permanent', categorie = 'Ongles naturels', prix = 10, duree_minutes = 30, ordre = 2, actif = true, sur_devis = false, en_option = false
  WHERE id = '7361073c-6f39-42c2-825c-6fc2cb17af18';
UPDATE public.prestations SET nom = 'Renforcement', categorie = 'Ongles naturels', prix = 40, duree_minutes = 60, ordre = 3, actif = true, sur_devis = false, en_option = false
  WHERE id = '769acc4e-e7e7-4821-9558-3bd7fe144de9';
UPDATE public.prestations SET nom = 'Remplissage renforcement', categorie = 'Ongles naturels', prix = 35, duree_minutes = 90, ordre = 4, actif = true, sur_devis = false, en_option = false
  WHERE id = 'f284fa8a-b6d7-4a15-b1d2-1984c2685ec7';
UPDATE public.prestations SET nom = 'Dépose renforcement', categorie = 'Ongles naturels', prix = 15, duree_minutes = 30, ordre = 5, actif = true, sur_devis = false, en_option = false
  WHERE id = 'a60f3944-c767-481e-ac23-c6fb798943f7';
UPDATE public.prestations SET nom = 'Manucure homme', categorie = 'Ongles naturels', prix = 30, duree_minutes = 30, ordre = 6, actif = true, sur_devis = false, en_option = false
  WHERE id = '892b12b6-0781-4983-aaae-4957298b1246';
UPDATE public.prestations SET nom = 'Pose complète', categorie = 'Extension gel', prix = 60, duree_minutes = 90, ordre = 7, actif = true, sur_devis = false, en_option = false
  WHERE id = '84d74d5b-b973-453e-9927-de63c8654dd0';
UPDATE public.prestations SET nom = 'Remplissage', categorie = 'Extension gel', prix = 55, duree_minutes = 120, ordre = 8, actif = true, sur_devis = false, en_option = false
  WHERE id = '74fac293-6be2-4dd2-a73b-c277d6446a63';
UPDATE public.prestations SET nom = 'Pose complète', categorie = 'Gel-X', prix = 50, duree_minutes = 60, ordre = 10, actif = true, sur_devis = false, en_option = false
  WHERE id = '9c175443-e191-465e-84c9-18b039ceb022';

-- Retirées de la carte : masquées (jamais supprimées)
UPDATE public.prestations SET actif = false
  WHERE id IN ('61cb8611-db45-4998-8127-8948a2017d76',  -- Nail art simple
               '334e128a-7ced-4eff-b4d2-2e080934b6c3'); -- Nail art avancé

-- Nouvelles prestations (ajoutées une seule fois)
INSERT INTO public.prestations (nom, categorie, prix, duree_minutes, ordre, description, sur_devis, en_option)
SELECT v.nom, v.categorie, v.prix, v.duree, v.ordre, v.description, v.sur_devis, v.en_option
FROM (VALUES
  ('Dépose', 'Extension gel', 25, 30, 9, '', false, false),
  ('Dépose + pose', 'Gel-X', 55, 90, 11, '', false, false),
  ('Dépose', 'Gel-X', 20, 30, 12, '', false, false),
  ('French', 'Nail art', 10, 20, 13, 'French classique ou double french fine.', false, true),
  ('Nail art niveau 1', 'Nail art', 15, 20, 14, 'Décoration légère pour sublimer la pose.', false, true),
  ('Nail art niveau 2', 'Nail art', 20, 30, 15, 'Design travaillé avec effets ou ajout de matière.', false, true),
  ('Nail art niveau 3', 'Nail art', 25, 40, 16, 'Création artistique complète.', false, true),
  ('Nail art premium XL', 'Nail art', 0, 60, 17, 'Chrome complet, paillettes, feuille d''or, bijoux, effets.', true, true)
) AS v(nom, categorie, prix, duree, ordre, description, sur_devis, en_option)
WHERE NOT EXISTS (
  SELECT 1 FROM public.prestations p WHERE p.nom = v.nom AND p.categorie = v.categorie
);
