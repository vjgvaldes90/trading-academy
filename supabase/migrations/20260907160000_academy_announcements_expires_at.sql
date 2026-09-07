-- Academy announcements: 24-hour expiration (expires_at).
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.
-- Preserves existing rows; expired rows are left for app lazy cleanup / Vercel Cron.

ALTER TABLE public.academy_announcements
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Existing announcements: 24h from creation (no published_at column in this schema).
UPDATE public.academy_announcements
SET expires_at = created_at + interval '24 hours'
WHERE expires_at IS NULL;

ALTER TABLE public.academy_announcements
  ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE public.academy_announcements
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

CREATE INDEX IF NOT EXISTS idx_academy_announcements_expires_at
  ON public.academy_announcements (expires_at);

-- Supports student visibility filters: published = true AND expires_at > now()
-- (partial index on published only; do not put now() in the index predicate).
CREATE INDEX IF NOT EXISTS idx_academy_announcements_published_expires_at
  ON public.academy_announcements (expires_at)
  WHERE published = true;

-- Replace existing student SELECT policy (same name as 20260729180000_academy_announcements.sql).
DROP POLICY IF EXISTS "students_select_published_announcements"
  ON public.academy_announcements;

CREATE POLICY "students_select_published_announcements"
  ON public.academy_announcements
  FOR SELECT
  TO authenticated
  USING (published = true AND expires_at > now());

COMMENT ON COLUMN public.academy_announcements.expires_at IS
  'Server-set expiry (typically create/publish + 24h). Students only see rows where expires_at > now().';
