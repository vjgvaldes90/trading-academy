-- Recorded classes (admin-managed lessons; published rows readable via API)

CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    video_url text NOT NULL,
    is_published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lessons IS 'Recorded class metadata (e.g. YouTube embed URL).';
COMMENT ON COLUMN public.lessons.video_url IS 'YouTube embed or watch URL.';
COMMENT ON COLUMN public.lessons.is_published IS 'When false, hidden from public GET /api/lessons.';

CREATE INDEX IF NOT EXISTS lessons_created_at_desc ON public.lessons (created_at DESC);
CREATE INDEX IF NOT EXISTS lessons_published ON public.lessons (is_published) WHERE is_published = true;
