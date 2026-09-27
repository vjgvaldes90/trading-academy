-- Content classification for lessons, independent of class_type (trading | theory).
-- Existing rows become recorded_class via DEFAULT. Does NOT touch video_url,
-- storage_path, source_type, is_published, or Storage objects/policies.

ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'recorded_class';

COMMENT ON COLUMN public.lessons.content_type IS
    'recorded_class = live class that was recorded; tutorial = standalone educational video.';

ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_content_type_check;
ALTER TABLE public.lessons
    ADD CONSTRAINT lessons_content_type_check
    CHECK (content_type IN ('recorded_class', 'tutorial'));

-- Reclassify the existing Webull tutorial (uploaded 2026-09-27). Tutorials carry no class_type.
UPDATE public.lessons
SET
    content_type = 'tutorial',
    class_type = NULL
WHERE id = '2e7c965f-2428-4a10-b9d4-707badecc08b';
