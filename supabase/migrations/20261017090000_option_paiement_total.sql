-- ============================================================
-- OPTION DE PAIEMENT : ACOMPTE (30 %) OU TOTALITÉ
-- - mode_paiement     : option choisie par la cliente à l'étape Paiement.
-- - montant_paye      : montant réellement encaissé en ligne (lu chez Stripe).
-- - montant_rembourse : total déjà remboursé (refus, annulation, absence).
-- - acompte_montant   : reste l'acompte (30 % du total) = ce que Maria garde
--   en cas d'annulation à moins de 72 h ou d'absence.
-- - acompte_statut « rembourse_partiel » : une partie a été remboursée
--   (la cliente avait tout payé, Maria garde l'équivalent de l'acompte).
-- Rejouable sans danger.
-- ============================================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS mode_paiement text NOT NULL DEFAULT 'acompte',
  ADD COLUMN IF NOT EXISTS montant_paye numeric(10,2),
  ADD COLUMN IF NOT EXISTS montant_rembourse numeric(10,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_mode_paiement_check') THEN
    ALTER TABLE public.reservations ADD CONSTRAINT reservations_mode_paiement_check
      CHECK (mode_paiement IN ('acompte', 'total'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_montants_check') THEN
    ALTER TABLE public.reservations ADD CONSTRAINT reservations_montants_check
      CHECK (montant_rembourse >= 0 AND (montant_paye IS NULL OR montant_rembourse <= montant_paye));
  END IF;
END $$;

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_acompte_statut_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_acompte_statut_check
  CHECK (acompte_statut IN ('non_requis', 'en_attente', 'paye', 'rembourse', 'rembourse_partiel', 'expire'));

-- Rendez-vous payés avant cette évolution : c'était toujours l'acompte.
UPDATE public.reservations
SET montant_paye = acompte_montant
WHERE montant_paye IS NULL AND acompte_statut IN ('paye', 'rembourse');
UPDATE public.reservations
SET montant_rembourse = montant_paye
WHERE acompte_statut = 'rembourse' AND montant_rembourse = 0 AND montant_paye IS NOT NULL;
