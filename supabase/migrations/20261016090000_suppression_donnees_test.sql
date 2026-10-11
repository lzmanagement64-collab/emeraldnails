-- ============================================================
-- MISE EN PRODUCTION : suppression des données de test (accord du 11/10/2026)
-- - L'ancienne table « bookings » (ancienne réservation, plus utilisée) est supprimée.
-- - Les réservations de test et l'ancien rôle de emeraldnails@outlook.fr ont été
--   supprimés directement dans la base (une copie est gardée dans le schéma
--   « sauvegarde », illisible par les visiteurs).
-- Rejouable sans danger.
-- ============================================================
DROP TABLE IF EXISTS public.bookings;
