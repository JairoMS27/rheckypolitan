-- Allow any authenticated user to manage their own artículos (posts).
-- Revistas (issues) remain admin-only via existing policies.

DROP POLICY IF EXISTS "Authors read own posts" ON public.posts;
CREATE POLICY "Authors read own posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors insert own posts" ON public.posts;
CREATE POLICY "Authors insert own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors update own posts" ON public.posts;
CREATE POLICY "Authors update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors delete own posts" ON public.posts;
CREATE POLICY "Authors delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Storage: any authenticated author can manage objects under posts/
DROP POLICY IF EXISTS "magazines authors insert posts" ON storage.objects;
CREATE POLICY "magazines authors insert posts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'magazines'
    AND (storage.foldername(name))[1] = 'posts'
  );

DROP POLICY IF EXISTS "magazines authors update posts" ON storage.objects;
CREATE POLICY "magazines authors update posts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'magazines'
    AND (storage.foldername(name))[1] = 'posts'
  )
  WITH CHECK (
    bucket_id = 'magazines'
    AND (storage.foldername(name))[1] = 'posts'
  );

DROP POLICY IF EXISTS "magazines authors delete posts" ON storage.objects;
CREATE POLICY "magazines authors delete posts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'magazines'
    AND (storage.foldername(name))[1] = 'posts'
  );
