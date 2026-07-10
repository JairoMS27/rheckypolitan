-- User profiles: unique username, bio, follows (followers/following)

-- ------------------------------------------------------------
-- 1. Profile columns
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Case-insensitive unique usernames (when set)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (
    username IS NULL
    OR username ~ '^[a-zA-Z0-9_]{3,30}$'
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length
  CHECK (bio IS NULL OR char_length(bio) <= 280);

-- ------------------------------------------------------------
-- 2. Backfill usernames from display_name / id
-- ------------------------------------------------------------
WITH base AS (
  SELECT
    id,
    lower(
      regexp_replace(
        coalesce(nullif(trim(display_name), ''), 'user'),
        '[^a-zA-Z0-9_]+',
        '_',
        'g'
      )
    ) AS raw_slug
  FROM public.profiles
  WHERE username IS NULL
),
normalized AS (
  SELECT
    id,
    left(
      CASE
        WHEN raw_slug ~ '^[a-zA-Z0-9_]' AND length(raw_slug) >= 3 THEN raw_slug
        WHEN length(raw_slug) < 3 THEN raw_slug || 'user'
        ELSE 'u_' || raw_slug
      END,
      24
    ) AS base_slug
  FROM base
),
numbered AS (
  SELECT
    id,
    base_slug,
    row_number() OVER (PARTITION BY base_slug ORDER BY id) AS rn
  FROM normalized
)
UPDATE public.profiles p
SET username = CASE
  WHEN n.rn = 1 THEN n.base_slug
  ELSE left(n.base_slug, 20) || '_' || n.rn::text
END
FROM numbered n
WHERE p.id = n.id
  AND p.username IS NULL;

-- ------------------------------------------------------------
-- 3. New-user trigger: username + display_name
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugify_username(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  slug TEXT;
BEGIN
  slug := lower(regexp_replace(coalesce(nullif(trim(raw), ''), 'user'), '[^a-zA-Z0-9_]+', '_', 'g'));
  IF length(slug) < 3 THEN
    slug := slug || 'user';
  END IF;
  IF slug !~ '^[a-zA-Z0-9_]' THEN
    slug := 'u_' || slug;
  END IF;
  RETURN left(slug, 24);
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_username(preferred TEXT, user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 0;
BEGIN
  base := public.slugify_username(preferred);
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(candidate)
      AND id <> user_id
  ) LOOP
    n := n + 1;
    candidate := left(base, 20) || '_' || n::text;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preferred_name TEXT;
  uname TEXT;
BEGIN
  preferred_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'Lector'
  );
  uname := public.allocate_username(
    COALESCE(NEW.raw_user_meta_data->>'username', preferred_name),
    NEW.id
  );
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (NEW.id, preferred_name, uname)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Keep updated_at fresh on profile edits
CREATE OR REPLACE FUNCTION public.touch_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_profiles_updated_at();

-- ------------------------------------------------------------
-- 4. Follows
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows (follower_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read follows" ON public.follows;
CREATE POLICY "Public can read follows"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = (SELECT auth.uid()));

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

-- Ensure profile grants still cover new columns
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
