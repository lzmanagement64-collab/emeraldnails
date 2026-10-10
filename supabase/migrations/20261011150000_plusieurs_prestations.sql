-- ============================================================
-- PLUSIEURS PRESTATIONS PAR RENDEZ-VOUS
-- - prestations_detail : liste des prestations choisies (nom, prix, durée),
--   figée au moment de la réservation. prestation_id reste la première
--   prestation, pour les rendez-vous existants et l'admin.
-- - get_creneaux_disponibles_duree : créneaux libres pour une durée totale
--   (mêmes règles : horaires, pause, absences, autres rendez-vous).
-- Ajout uniquement : aucune donnée supprimée ni modifiée. Rejouable.
-- ============================================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS prestations_detail jsonb;

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
  duree int;
  h record;
  pas int := 15;
  curseur timestamptz;
  fin_journee timestamptz;
  debut_slot timestamptz;
  fin_slot timestamptz;
BEGIN
  -- Durée totale des prestations choisies (calculée par le serveur du site).
  duree := p_duree;
  IF duree IS NULL OR duree < 5 OR duree > 720 THEN RETURN; END IF;

  IF date_recherche > (now() AT TIME ZONE 'Europe/Paris')::date + 60 THEN RETURN; END IF;

  SELECT * INTO h FROM public.horaires_ouverture
  WHERE jour_semaine = EXTRACT(DOW FROM date_recherche)::int AND ferme = false;
  IF h IS NULL THEN RETURN; END IF;

  curseur := (date_recherche + h.heure_debut) AT TIME ZONE 'Europe/Paris';
  fin_journee := (date_recherche + h.heure_fin) AT TIME ZONE 'Europe/Paris';

  WHILE curseur + make_interval(mins => duree) <= fin_journee LOOP
    debut_slot := curseur;
    fin_slot := curseur + make_interval(mins => duree);

    IF debut_slot > now() + interval '12 hours'
       -- pause déjeuner
       AND NOT (
         h.pause_debut IS NOT NULL AND h.pause_fin IS NOT NULL
         AND tstzrange(debut_slot, fin_slot) && tstzrange(
           (date_recherche + h.pause_debut) AT TIME ZONE 'Europe/Paris',
           (date_recherche + h.pause_fin) AT TIME ZONE 'Europe/Paris')
       )
       -- indisponibilités
       AND NOT EXISTS (
         SELECT 1 FROM public.indisponibilites i
         WHERE tstzrange(i.date_debut, i.date_fin) && tstzrange(debut_slot, fin_slot)
       )
       -- réservations existantes
       AND NOT EXISTS (
         SELECT 1 FROM public.reservations r
         WHERE r.statut <> 'annulee'
           -- réservation provisoire dont le délai de paiement est dépassé : créneau libre
           AND NOT (r.acompte_statut = 'en_attente' AND coalesce(r.acompte_expire_le, 'infinity') < now())
           AND tstzrange(r.date_debut, r.date_fin) && tstzrange(debut_slot, fin_slot)
       )
    THEN
      heure_debut := (debut_slot AT TIME ZONE 'Europe/Paris')::time;
      RETURN NEXT;
    END IF;

    curseur := curseur + make_interval(mins => pas);
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.get_creneaux_disponibles_duree(date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creneaux_disponibles_duree(date, integer) TO anon, authenticated, service_role;
