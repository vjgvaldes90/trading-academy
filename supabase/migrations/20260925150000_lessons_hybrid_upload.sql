-- Hybrid recorded lessons: keep YouTube video_url; add private Storage upload metadata.
-- Does NOT rewrite existing rows' URLs. Existing rows default to source_type = youtube.

-- ---------------------------------------------------------------------------
-- 1. Extend public.lessons
-- ---------------------------------------------------------------------------

ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'youtube',
    ADD COLUMN IF NOT EXISTS storage_path text NULL,
    ADD COLUMN IF NOT EXISTS class_date timestamptz NULL,
    ADD COLUMN IF NOT EXISTS class_type text NULL;

-- Upload lessons may omit video_url; YouTube lessons keep it.
ALTER TABLE public.lessons
    ALTER COLUMN video_url DROP NOT NULL;

COMMENT ON COLUMN public.lessons.source_type IS
    'youtube = embed/watch URL in video_url; upload = private object in storage_path.';
COMMENT ON COLUMN public.lessons.storage_path IS
    'Private object path inside the recorded-classes bucket (upload source only).';
COMMENT ON COLUMN public.lessons.class_date IS
    'Calendar datetime of the class (optional; distinct from created_at).';
COMMENT ON COLUMN public.lessons.class_type IS
    'Optional lesson category: trading | theory.';

ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_source_type_check;
ALTER TABLE public.lessons
    ADD CONSTRAINT lessons_source_type_check
    CHECK (source_type IN ('youtube', 'upload'));

ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_class_type_check;
ALTER TABLE public.lessons
    ADD CONSTRAINT lessons_class_type_check
    CHECK (class_type IS NULL OR class_type IN ('trading', 'theory'));

ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_source_payload_check;
ALTER TABLE public.lessons
    ADD CONSTRAINT lessons_source_payload_check
    CHECK (
        (
            source_type = 'youtube'
            AND video_url IS NOT NULL
            AND length(trim(video_url)) > 0
            AND storage_path IS NULL
        )
        OR (
            source_type = 'upload'
            AND storage_path IS NOT NULL
            AND length(trim(storage_path)) > 0
        )
    );

CREATE UNIQUE INDEX IF NOT EXISTS lessons_storage_path_uidx
    ON public.lessons (storage_path)
    WHERE storage_path IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Private Storage bucket (no public reads)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'recorded-classes',
    'recorded-classes',
    false,
    524288000, -- 500 MiB; raise in dashboard if needed
    ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Deny direct client access; app uses service-role signed URLs only.
DROP POLICY IF EXISTS "recorded_classes_no_public_select" ON storage.objects;
DROP POLICY IF EXISTS "recorded_classes_no_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "recorded_classes_no_public_update" ON storage.objects;
DROP POLICY IF EXISTS "recorded_classes_no_public_delete" ON storage.objects;

-- Intentionally no permissive policies for anon/authenticated on this bucket.
-- Service role bypasses RLS when minting signed upload/download URLs.
