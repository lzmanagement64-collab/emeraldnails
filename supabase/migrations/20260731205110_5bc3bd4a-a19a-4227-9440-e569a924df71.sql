ALTER TABLE public.prestations ALTER COLUMN couleur SET DEFAULT '#1f6b43';
UPDATE public.prestations SET couleur = '#1f6b43' WHERE couleur !~ '^#[0-9a-fA-F]{6}$';