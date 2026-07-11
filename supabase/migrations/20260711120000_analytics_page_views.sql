-- First-party analytics page views (only stored when user consents to analytics).
-- Inserts go through service role API; admins can SELECT via RLS.

CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_page_views_created_at_idx
  ON public.analytics_page_views (created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_page_views_path_idx
  ON public.analytics_page_views (path);

CREATE INDEX IF NOT EXISTS analytics_page_views_visitor_id_idx
  ON public.analytics_page_views (visitor_id);

ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_page_views admin select" ON public.analytics_page_views;
CREATE POLICY "analytics_page_views admin select"
  ON public.analytics_page_views
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No public INSERT/UPDATE/DELETE — only service_role via API routes
GRANT SELECT ON public.analytics_page_views TO authenticated;
GRANT ALL ON public.analytics_page_views TO service_role;

COMMENT ON TABLE public.analytics_page_views IS
  'Page hits collected only after cookie analytics consent; first-party only.';
