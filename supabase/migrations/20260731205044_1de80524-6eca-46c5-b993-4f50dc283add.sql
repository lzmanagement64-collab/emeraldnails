CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- PRESTATIONS
-- ============================================================
CREATE TABLE public.prestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text NOT NULL DEFAULT '',
  duree_minutes int NOT NULL CHECK (duree_minutes > 0 AND duree_minutes <= 600),
  prix numeric(10,2) NOT NULL CHECK (prix >= 0),
  couleur text NOT NULL DEFAULT '#1f6b४3',
  actif boolean NOT NULL DEFAULT true,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prestations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestations TO authenticated;
GRANT ALL ON public.prestations TO service_role;
ALTER TABLE public.prestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prestations actives visibles publiquement"
  ON public.prestations FOR SELECT TO anon, authenticated
  USING (actif = true);
CREATE POLICY "Staff gere les prestations"
  ON public.prestations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER prestations_updated_at BEFORE UPDATE ON public.prestations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- HORAIRES D'OUVERTURE
-- ============================================================
CREATE TABLE public.horaires_ouverture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jour_semaine int NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),
  heure_debut time NOT NULL DEFAULT '09:00',
  heure_fin time NOT NULL DEFAULT '18:00',
  pause_debut time,
  pause_fin time,
  ferme boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jour_semaine)
);

GRANT SELECT ON public.horaires_ouverture TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horaires_ouverture TO authenticated;
GRANT ALL ON public.horaires_ouverture TO service_role;
ALTER TABLE public.horaires_ouverture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Horaires visibles publiquement"
  ON public.horaires_ouverture FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff gere les horaires"
  ON public.horaires_ouverture FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER horaires_updated_at BEFORE UPDATE ON public.horaires_ouverture
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INDISPONIBILITES (aucun accès public)
-- ============================================================
CREATE TABLE public.indisponibilites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_debut timestamptz NOT NULL,
  date_fin timestamptz NOT NULL,
  motif text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indisponibilites TO authenticated;
GRANT ALL ON public.indisponibilites TO service_role;
ALTER TABLE public.indisponibilites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff gere les indisponibilites"
  ON public.indisponibilites FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER indispo_updated_at BEFORE UPDATE ON public.indisponibilites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.check_indispo_dates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.date_fin <= NEW.date_debut THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER indispo_dates BEFORE INSERT OR UPDATE ON public.indisponibilites
  FOR EACH ROW EXECUTE FUNCTION public.check_indispo_dates();

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestation_id uuid NOT NULL REFERENCES public.prestations(id),
  date_debut timestamptz NOT NULL,
  date_fin timestamptz NOT NULL,
  cliente_nom text NOT NULL,
  cliente_prenom text NOT NULL,
  cliente_telephone text NOT NULL,
  cliente_email text NOT NULL,
  commentaire text,
  statut text NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','confirmee','annulee','honoree','absente')),
  token_annulation uuid NOT NULL DEFAULT gen_random_uuid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- anti-doublon : pas de chevauchement hors réservations annulées
  CONSTRAINT reservations_pas_de_chevauchement EXCLUDE USING gist (
    tstzrange(date_debut, date_fin) WITH &&
  ) WHERE (statut <> 'annulee')
);

CREATE INDEX reservations_date_debut_idx ON public.reservations (date_debut);
CREATE INDEX reservations_email_idx ON public.reservations (lower(cliente_email));
CREATE INDEX reservations_token_idx ON public.reservations (token_annulation);

GRANT INSERT ON public.reservations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Public : uniquement dépôt d'une demande, jamais de lecture
CREATE POLICY "Public peut deposer une demande"
  ON public.reservations FOR INSERT TO anon, authenticated
  WITH CHECK (
    statut = 'en_attente'
    AND date_fin > date_debut
    AND date_debut > now() + interval '12 hours'
    AND date_debut < now() + interval '60 days'
  );

CREATE POLICY "Staff lit les reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff modifie les reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Staff supprime les reservations"
  ON public.reservations FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- FONCTION : créneaux disponibles (aucune donnée personnelle exposée)
-- ============================================================
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
           AND tstzrange(r.date_debut, r.date_fin) && tstzrange(debut_slot, fin_slot)
       )
    THEN
      heure_debut := (debut_slot AT TIME ZONE 'Europe/Paris')::time;
      RETURN NEXT;
    END IF;

    curseur := curseur + make_interval(mins => pas);
  END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.get_creneaux_disponibles(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creneaux_disponibles(date, uuid) TO anon, authenticated, service_role;

-- ============================================================
-- FONCTION : annulation par la cliente via son jeton
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
    AND date_debut > now();
  GET DIAGNOSTICS ok = ROW_COUNT;
  RETURN ok > 0;
END; $$;

REVOKE ALL ON FUNCTION public.annuler_reservation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.annuler_reservation(uuid) TO anon, authenticated, service_role;

-- ============================================================
-- DONNEES DE DEPART
-- ============================================================
INSERT INTO public.prestations (nom, description, duree_minutes, prix, couleur, ordre) VALUES
  ('Ongles naturels — beauté des mains', 'Mise en forme, cuticules et finition vernis semi-permanent.', 60, 30, '#1f6b43', 1),
  ('Ongles naturels — renfort gel', 'Renforcement des ongles naturels avec gel de protection.', 75, 40, '#2b7d52', 2),
  ('Extension gel — pose complète', 'Construction sur chablon, forme et longueur au choix.', 120, 55, '#0f4a2f', 3),
  ('Extension gel — remplissage', 'Entretien de la pose existante toutes les 3 à 4 semaines.', 90, 45, '#166b41', 4),
  ('Gel-X — pose complète', 'Pose de capsules Gel-X, résultat naturel et confortable.', 105, 60, '#3d8f63', 5),
  ('Nail art simple', 'French, chrome, aurora ou décor minimaliste.', 30, 10, '#c98b8b', 6),
  ('Nail art avancé', 'Décor 3D, fleurs, motifs personnalisés.', 45, 20, '#b57070', 7);

INSERT INTO public.horaires_ouverture (jour_semaine, heure_debut, heure_fin, pause_debut, pause_fin, ferme) VALUES
  (0, '09:00', '18:00', NULL, NULL, true),
  (1, '09:00', '19:00', '12:30', '13:30', false),
  (2, '09:00', '19:00', '12:30', '13:30', false),
  (3, '09:00', '19:00', '12:30', '13:30', false),
  (4, '09:00', '19:00', '12:30', '13:30', false),
  (5, '09:00', '19:00', '12:30', '13:30', false),
  (6, '09:00', '17:00', NULL, NULL, false);
