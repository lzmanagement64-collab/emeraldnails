-- ============================================================
-- NOTIFICATIONS PUSH DE L'APP « EMERALD BEAUTY PRO »
-- Tables lues et écrites uniquement par le serveur (aucune règle d'accès :
-- ni les visiteurs ni un compte connecté ne peuvent les lire directement).
-- - push_cles        : clés d'envoi du site (créées automatiquement).
-- - push_abonnements : appareils de la gérante qui reçoivent les notifications.
-- - push_envois_quotidiens : le rappel du matin n'est envoyé qu'une fois par jour.
-- Rejouable sans danger.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_cles (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cle_publique text NOT NULL,
  cle_privee_jwk jsonb NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_abonnements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND length(endpoint) <= 1000),
  p256dh text NOT NULL CHECK (length(p256dh) <= 200),
  auth text NOT NULL CHECK (length(auth) <= 100),
  appareil text NOT NULL DEFAULT '' CHECK (length(appareil) <= 120),
  cree_le timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_envois_quotidiens (
  jour date PRIMARY KEY,
  envoye_le timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_cles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_envois_quotidiens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_cles FROM anon, authenticated;
REVOKE ALL ON public.push_abonnements FROM anon, authenticated;
REVOKE ALL ON public.push_envois_quotidiens FROM anon, authenticated;
