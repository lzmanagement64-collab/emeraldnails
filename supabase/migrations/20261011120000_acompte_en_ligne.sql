-- ============================================================
-- ACOMPTE EN LIGNE (Stripe) — suivi du paiement sur chaque rendez-vous.
-- Ajout de colonnes uniquement : aucune donnée supprimée ni modifiée.
-- Les rendez-vous existants et ceux saisis dans l'admin restent
-- « non_requis » (pas d'acompte en ligne).
-- Rejouable sans danger.
-- ============================================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS prix_total numeric(10,2),
  ADD COLUMN IF NOT EXISTS acompte_montant numeric(10,2),
  ADD COLUMN IF NOT EXISTS acompte_statut text NOT NULL DEFAULT 'non_requis',
  ADD COLUMN IF NOT EXISTS acompte_expire_le timestamptz,
  ADD COLUMN IF NOT EXISTS acompte_paye_le timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text;

-- non_requis : pas d'acompte en ligne · en_attente : réservation provisoire,
-- paiement attendu · paye · rembourse · expire : délai de paiement dépassé
DO $$ BEGIN
  ALTER TABLE public.reservations ADD CONSTRAINT reservations_acompte_statut_check
    CHECK (acompte_statut IN ('non_requis', 'en_attente', 'paye', 'rembourse', 'expire'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS reservations_stripe_session_idx ON public.reservations (stripe_session_id);
CREATE INDEX IF NOT EXISTS reservations_stripe_pi_idx ON public.reservations (stripe_payment_intent);

-- Créneaux disponibles : une réservation provisoire non payée dans le délai
-- ne bloque plus le créneau (le serveur la passe ensuite en « annulée »).
CREATE OR REPLACE FUNCTION public.get_creneaux_disponibles(
  date_recherche date,
  prestation_id uuid
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
  SELECT p.duree_minutes INTO duree
  FROM public.prestations p
  WHERE p.id = prestation_id AND p.actif = true;
  IF duree IS NULL THEN RETURN; END IF;

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
