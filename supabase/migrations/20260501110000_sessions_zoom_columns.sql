ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS zoom_meeting_id text,
    ADD COLUMN IF NOT EXISTS zoom_start_url text,
    ADD COLUMN IF NOT EXISTS zoom_password text;

COMMENT ON COLUMN public.sessions.zoom_meeting_id IS 'Zoom numeric meeting id (string) for REST updates/deletes.';
COMMENT ON COLUMN public.sessions.zoom_start_url IS 'Zoom host start URL for admins; join URL stays in sessions.link.';
COMMENT ON COLUMN public.sessions.zoom_password IS 'Zoom meeting passcode shown to admins if needed.';
