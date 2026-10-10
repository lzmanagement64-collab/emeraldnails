-- ============================================================
-- GALERIE : RÈGLES DU STOCKAGE RENFORCÉES
-- - Seuls des fichiers « <identifiant>/grand.webp » ou « <identifiant>/petit.webp »
--   peuvent être déposés : aucun autre fichier ne peut être ajouté au stockage.
-- - Le remplacement d'un fichier vérifie aussi le résultat (même dossier « galerie »,
--   même forme de nom), pas seulement le fichier de départ.
-- Aucune donnée supprimée. Rejouable sans danger.
-- ============================================================

DROP POLICY IF EXISTS "Galerie : la gerante ajoute" ON storage.objects;
CREATE POLICY "Galerie : la gerante ajoute" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'galerie'
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(grand|petit)\.webp$'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  );

DROP POLICY IF EXISTS "Galerie : la gerante remplace" ON storage.objects;
CREATE POLICY "Galerie : la gerante remplace" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'galerie' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')))
  WITH CHECK (
    bucket_id = 'galerie'
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(grand|petit)\.webp$'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'))
  );
