-- Optional private Google Drive file for downloading a recorded class.
-- The file stays private in the Shared Drive; students download it only through
-- GET /api/lessons/[id]/download (server-side WIF). Existing rows stay NULL.
-- Does NOT touch video_url, storage_path, source_type, content_type or Storage.

ALTER TABLE public.lessons
    ADD COLUMN IF NOT EXISTS google_drive_file_id text NULL;

COMMENT ON COLUMN public.lessons.google_drive_file_id IS
    'Private Google Drive file ID for recorded-class downloads (recorded_class only). Never exposed to students.';

ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_google_drive_file_id_check;
ALTER TABLE public.lessons
    ADD CONSTRAINT lessons_google_drive_file_id_check
    CHECK (
        google_drive_file_id IS NULL
        OR (
            content_type = 'recorded_class'
            AND google_drive_file_id ~ '^[A-Za-z0-9_-]{10,128}$'
        )
    );
