
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%';

-- Helper: is the current user a redactor
CREATE OR REPLACE FUNCTION public.is_redactor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'redactor'::app_role) $$;

-- Drop existing post policies to recreate
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can read all posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;

-- Public: published posts
CREATE POLICY "Public can read published posts"
  ON public.posts FOR SELECT
  USING (published = true);

-- Admin: all
CREATE POLICY "Admins manage all posts"
  ON public.posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Redactor: read own
CREATE POLICY "Redactors read own posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'redactor'::app_role) AND author_id = auth.uid());

-- Redactor: insert own
CREATE POLICY "Redactors insert own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'redactor'::app_role) AND author_id = auth.uid());

-- Redactor: update own
CREATE POLICY "Redactors update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'redactor'::app_role) AND author_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'redactor'::app_role) AND author_id = auth.uid());
