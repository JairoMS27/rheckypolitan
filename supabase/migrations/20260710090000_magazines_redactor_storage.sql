-- Allow redactors to upload/update/delete magazine assets under posts/
-- (covers + inline images). Admins keep full bucket access via existing policies.

DROP POLICY IF EXISTS "magazines redactor insert posts" ON storage.objects;
CREATE POLICY "magazines redactor insert posts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor'::public.app_role)
    AND (storage.foldername(name))[1] = 'posts'
  );

DROP POLICY IF EXISTS "magazines redactor update posts" ON storage.objects;
CREATE POLICY "magazines redactor update posts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor'::public.app_role)
    AND (storage.foldername(name))[1] = 'posts'
  )
  WITH CHECK (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor'::public.app_role)
    AND (storage.foldername(name))[1] = 'posts'
  );

DROP POLICY IF EXISTS "magazines redactor delete posts" ON storage.objects;
CREATE POLICY "magazines redactor delete posts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'magazines'
    AND public.has_role(auth.uid(), 'redactor'::public.app_role)
    AND (storage.foldername(name))[1] = 'posts'
  );
