-- Zoom cloud recording → Google Drive jobs (Stage 1).
-- One row per Zoom recording file; UNIQUE zoom_recording_file_id guarantees idempotency.
-- Service-role only: RLS enabled + forced, no policies.
-- drive_upload_session_uri is a short-lived credential: never expose it to clients.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.

CREATE TABLE IF NOT EXISTS public.zoom_recording_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NULL REFERENCES public.sessions (id) ON DELETE SET NULL,
    zoom_meeting_id text NOT NULL,
    zoom_meeting_uuid text NULL,
    zoom_recording_file_id text NOT NULL,
    recording_type text NULL,
    file_size bigint NULL,
    recording_start timestamptz NULL,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NULL,
    locked_at timestamptz NULL,
    last_error text NULL,
    drive_upload_session_uri text NULL,
    bytes_uploaded bigint NOT NULL DEFAULT 0,
    drive_file_id text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT zoom_recording_jobs_recording_file_id_key UNIQUE (zoom_recording_file_id),
    CONSTRAINT zoom_recording_jobs_status_check
        CHECK (status IN ('pending', 'processing', 'uploaded', 'failed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS zoom_recording_jobs_status_next_attempt_idx
    ON public.zoom_recording_jobs (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS zoom_recording_jobs_session_id_idx
    ON public.zoom_recording_jobs (session_id);

CREATE INDEX IF NOT EXISTS zoom_recording_jobs_zoom_meeting_id_idx
    ON public.zoom_recording_jobs (zoom_meeting_id);

CREATE INDEX IF NOT EXISTS zoom_recording_jobs_drive_file_id_idx
    ON public.zoom_recording_jobs (drive_file_id);

CREATE OR REPLACE FUNCTION public.set_zoom_recording_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zoom_recording_jobs_updated_at ON public.zoom_recording_jobs;
CREATE TRIGGER trg_zoom_recording_jobs_updated_at
    BEFORE UPDATE ON public.zoom_recording_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_zoom_recording_jobs_updated_at();

ALTER TABLE public.zoom_recording_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_recording_jobs FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.zoom_recording_jobs IS
    'Zoom recording.completed → Google Drive upload jobs. Service role only (no RLS policies).';

COMMENT ON COLUMN public.zoom_recording_jobs.status IS
    'pending | processing | uploaded | failed | skipped';
