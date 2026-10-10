-- ============================================================
-- ANNULATION — gratuite et possible en ligne jusqu'à 72 h avant
-- le rendez-vous. En dessous, le lien est refusé : la cliente est
-- invitée à appeler (message affiché par le site).
-- Le délai est aussi défini dans src/config/business.ts
-- (bookingRules.annulationGratuiteHeures) : garder les deux identiques.
-- Rejouable sans danger.
-- ============================================================
CREATE OR REPLACE FUNCTION public.annuler_reservation(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ok int;
BEGIN
  UPDATE public.reservations
  SET statut = 'annulee'
  WHERE token_annulation = p_token
    AND statut IN ('en_attente','confirmee')
    AND date_debut > now() + interval '72 hours';
  GET DIAGNOSTICS ok = ROW_COUNT;
  RETURN ok > 0;
END; $$;
