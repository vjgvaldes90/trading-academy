-- Live sessions: Trading Session vs Theory Class
-- Existing rows default to 'trading' (no behavior change).
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'trading';

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_session_type_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_session_type_check
  CHECK (session_type IN ('trading', 'theory'));

COMMENT ON COLUMN public.sessions.session_type IS
  'trading = academy access; theory = full_program + program_theory_until > now';

CREATE INDEX IF NOT EXISTS sessions_status_type_idx
  ON public.sessions (status, session_type);
