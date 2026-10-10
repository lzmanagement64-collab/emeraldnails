-- ============================================================
-- SÉCURITÉ — accès de gestion réservé au compte de la gérante,
-- vérifié directement par la base de données (règles RLS).
-- Ce script peut être rejoué sans danger (idempotent).
-- Aucune table n'est créée ni supprimée, aucune donnée n'est effacée.
-- ============================================================

-- 1) Le rôle « admin » / « staff » ne compte QUE pour le compte
--    emeraldnails@outlook.fr, adresse confirmée. Toutes les règles
--    d'accès passent par has_role() : tout autre compte, même porteur
--    d'un rôle en base, ne peut plus rien lire ni modifier.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND lower(u.email) = 'emeraldnails@outlook.fr'
      AND u.email_confirmed_at IS NOT NULL
  );
$$;

-- 2) Réservations : plus aucune écriture directe depuis le navigateur.
--    Les demandes des clientes passent par le serveur du site (validation,
--    anti-spam), qui écrit avec sa propre clé. Seule la gérante peut créer
--    un rendez-vous manuellement (ce qui corrige aussi la création depuis
--    l'admin avec le statut « confirmé », refusée jusqu'ici).
DROP POLICY IF EXISTS "Public peut deposer une demande" ON public.reservations;
DROP POLICY IF EXISTS "Staff cree les reservations" ON public.reservations;
CREATE POLICY "Staff cree les reservations"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- 3) Droits minimum (double sécurité en plus des règles RLS).
--    Visiteuses non connectées : lecture des prestations et des horaires, rien d'autre.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.prestations, public.horaires_ouverture TO anon;

--    Comptes connectés : pas de vidage de table ni de modification des rôles.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, DELETE ON public.bookings, public.leads FROM authenticated;
