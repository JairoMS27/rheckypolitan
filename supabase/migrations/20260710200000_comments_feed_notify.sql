-- Comments: replies + likes; follows: notify on posts; remove followers

-- ------------------------------------------------------------
-- 1. Comment replies
-- ------------------------------------------------------------
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id
  ON public.comments (parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON public.comments (post_id, created_at);

-- ------------------------------------------------------------
-- 2. Comment likes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user
  ON public.comment_likes (user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read comment likes" ON public.comment_likes;
CREATE POLICY "Public can read comment likes"
  ON public.comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users like comments" ON public.comment_likes;
CREATE POLICY "Users like comments"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users unlike comments" ON public.comment_likes;
CREATE POLICY "Users unlike comments"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.comment_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;

-- ------------------------------------------------------------
-- 3. Follow notifications preference
-- ------------------------------------------------------------
ALTER TABLE public.follows
  ADD COLUMN IF NOT EXISTS notify_posts BOOLEAN NOT NULL DEFAULT false;

-- Allow removing a follower (block) as well as unfollowing
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
DROP POLICY IF EXISTS "Users manage own follow edges" ON public.follows;
CREATE POLICY "Users manage own follow edges"
  ON public.follows FOR DELETE TO authenticated
  USING (
    follower_id = (SELECT auth.uid())
    OR following_id = (SELECT auth.uid())
  );

-- Allow follower to update notify_posts on their own follow row
DROP POLICY IF EXISTS "Users update own follow prefs" ON public.follows;
CREATE POLICY "Users update own follow prefs"
  ON public.follows FOR UPDATE TO authenticated
  USING (follower_id = (SELECT auth.uid()))
  WITH CHECK (follower_id = (SELECT auth.uid()));

GRANT UPDATE ON public.follows TO authenticated;
