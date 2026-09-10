-- Private Class Stage 4: Zoom meeting fields after paid → confirmed.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS zoom_meeting_id text NULL;

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS zoom_join_url text NULL;

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS zoom_start_url text NULL;

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS zoom_password text NULL;

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS zoom_created_at timestamptz NULL;

CREATE UNIQUE INDEX IF NOT EXISTS private_class_requests_zoom_meeting_id_uidx
  ON public.private_class_requests (zoom_meeting_id)
  WHERE zoom_meeting_id IS NOT NULL;

COMMENT ON COLUMN public.private_class_requests.zoom_meeting_id IS
  'Zoom scheduled meeting id (idempotency key for Stage 4).';

COMMENT ON COLUMN public.private_class_requests.zoom_join_url IS
  'Student Join URL — safe to expose to the authenticated student.';

COMMENT ON COLUMN public.private_class_requests.zoom_start_url IS
  'Host Start URL — admin/host only; never expose to students.';

COMMENT ON COLUMN public.private_class_requests.zoom_password IS
  'Optional Zoom passcode snapshot; prefer not exposing to students.';

COMMENT ON COLUMN public.private_class_requests.zoom_created_at IS
  'When Zoom meeting was created for this private class.';
