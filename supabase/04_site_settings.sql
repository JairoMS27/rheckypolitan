-- Ejecutar en Supabase SQL Editor si no usas migraciones automáticas
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (id, maintenance_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings" ON public.site_settings;
CREATE POLICY "Public read site settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);