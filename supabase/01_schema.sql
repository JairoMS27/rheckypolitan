-- ============================================================
-- RHECKYPOLITAN — Schema completo (ejecutar UNA vez en SQL Editor)
-- Después ejecuta: seed.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Roles y usuarios admin
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'redactor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "user_roles select self" ON public.user_roles;
CREATE POLICY "user_roles select self" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- ------------------------------------------------------------
-- 2. Revista (issues + pages)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  published_at DATE NOT NULL,
  cover_path TEXT,
  page_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS credits JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_quotes BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "issues public read" ON public.issues;
CREATE POLICY "issues public read" ON public.issues FOR SELECT USING (true);
DROP POLICY IF EXISTS "issues admin insert" ON public.issues;
CREATE POLICY "issues admin insert" ON public.issues
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "issues admin update" ON public.issues;
CREATE POLICY "issues admin update" ON public.issues
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "issues admin delete" ON public.issues;
CREATE POLICY "issues admin delete" ON public.issues
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  index INT NOT NULL,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_id, index)
);

CREATE INDEX IF NOT EXISTS pages_issue_idx ON public.pages(issue_id, index);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pages public read" ON public.pages;
CREATE POLICY "pages public read" ON public.pages FOR SELECT USING (true);
DROP POLICY IF EXISTS "pages admin insert" ON public.pages;
CREATE POLICY "pages admin insert" ON public.pages
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "pages admin update" ON public.pages;
CREATE POLICY "pages admin update" ON public.pages
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "pages admin delete" ON public.pages;
CREATE POLICY "pages admin delete" ON public.pages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 3. Artículos (posts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN (
    'actualidad','entretenimiento','conspiracion',
    'gastronomia','entrevistas','pasatiempos'
  )),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover_path TEXT,
  content_html TEXT NOT NULL DEFAULT '',
  author TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cover_position TEXT NOT NULL DEFAULT '50% 50%',
  UNIQUE (section, slug)
);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_position TEXT NOT NULL DEFAULT '50% 50%';

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;
CREATE POLICY "Public can read published posts"
  ON public.posts FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Admins can read all posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admins manage all posts" ON public.posts;
CREATE POLICY "Admins manage all posts"
  ON public.posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_posts_section_published
  ON public.posts (section, published_at DESC) WHERE published = true;

-- ------------------------------------------------------------
-- 4. Newsletter
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can view subscribers"
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can delete subscribers"
  ON public.newsletter_subscribers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 5. Email (tablas — sin depender de extensiones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'pending','sent','suppressed','failed','bounced','complained','dlq'
  )),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- 6. Perfiles y comentarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;
CREATE POLICY "Public can read profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id, created_at);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read comments" ON public.comments;
CREATE POLICY "Public can read comments" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users insert own comments" ON public.comments;
CREATE POLICY "Authenticated users insert own comments"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own comments" ON public.comments;
CREATE POLICY "Users update own comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own comments" ON public.comments;
CREATE POLICY "Users delete own comments"
  ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins delete any comment" ON public.comments;
CREATE POLICY "Admins delete any comment"
  ON public.comments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'Lector')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 7. Storage (magazines + avatars)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('magazines', 'magazines', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "magazines public read" ON storage.objects;
CREATE POLICY "magazines public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'magazines');
DROP POLICY IF EXISTS "magazines admin insert" ON storage.objects;
CREATE POLICY "magazines admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'magazines' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "magazines admin update" ON storage.objects;
CREATE POLICY "magazines admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'magazines' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "magazines admin delete" ON storage.objects;
CREATE POLICY "magazines admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'magazines' AND public.has_role(auth.uid(), 'admin'));

-- Redactors: only paths under posts/ (covers + inline images)
DROP POLICY IF EXISTS "magazines redactor insert posts" ON storage.objects;
CREATE POLICY "magazines redactor insert posts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor')
    AND (storage.foldername(name))[1] = 'posts'
  );
DROP POLICY IF EXISTS "magazines redactor update posts" ON storage.objects;
CREATE POLICY "magazines redactor update posts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor')
    AND (storage.foldername(name))[1] = 'posts'
  )
  WITH CHECK (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor')
    AND (storage.foldername(name))[1] = 'posts'
  );
DROP POLICY IF EXISTS "magazines redactor delete posts" ON storage.objects;
CREATE POLICY "magazines redactor delete posts"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor')
    AND (storage.foldername(name))[1] = 'posts'
  );

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);