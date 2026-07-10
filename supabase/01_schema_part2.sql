-- ============================================================
-- RHECKYPOLITAN — Paso 2 del schema (ejecutar en QUERY SEPARADA)
-- PostgreSQL exige commit entre añadir un enum y usarlo.
-- Ejecuta esto DESPUÉS de 01_schema.sql, ANTES de seed.sql
-- ============================================================

-- Solo necesario si 01_schema creó el enum solo con 'admin'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'redactor';

CREATE OR REPLACE FUNCTION public.is_redactor()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'redactor'::public.app_role) $$;

-- Any authenticated account may manage their own artículos (not only redactor role).
DROP POLICY IF EXISTS "Redactors read own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors read own posts" ON public.posts;
CREATE POLICY "Authors read own posts"
  ON public.posts FOR SELECT TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Redactors insert own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors insert own posts" ON public.posts;
CREATE POLICY "Authors insert own posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Redactors update own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors update own posts" ON public.posts;
CREATE POLICY "Authors update own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors delete own posts" ON public.posts;
CREATE POLICY "Authors delete own posts"
  ON public.posts FOR DELETE TO authenticated
  USING (author_id = auth.uid());