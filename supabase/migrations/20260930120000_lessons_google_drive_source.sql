-- Allow recorded classes whose only video source is a private Google Drive file.
-- google_drive lessons have no video_url / storage_path; students get the
-- authenticated download (GET /api/lessons/[id]/download) instead of a player.
-- Existing youtube / upload rows keep satisfying the same rules as before.
-- lessons_google_drive_file_id_check already limits Drive IDs to recorded_class.

ALTER TABLE public.lessons
    DROP CONSTRAINT IF EXISTS lessons_source_type_check;
ALTER TABLE public.lessons
    ADD CONSTRAINT lessons_source_type_check
    CHECK (source_type IN ('youtube', 'upload', 'google_drive'));

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
        OR (
            source_type = 'google_drive'
            AND google_drive_file_id IS NOT NULL
            AND video_url IS NULL
            AND storage_path IS NULL
        )
    );

COMMENT ON COLUMN public.lessons.source_type IS
    'youtube = embed/watch URL in video_url; upload = private object in storage_path; google_drive = private Drive file in google_drive_file_id (download only).';
