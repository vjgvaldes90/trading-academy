ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS created_by_admin_email text,
    ADD COLUMN IF NOT EXISTS last_edited_by_admin_email text,
    ADD COLUMN IF NOT EXISTS last_hosted_by_admin_email text,
    ADD COLUMN IF NOT EXISTS last_hosted_at timestamptz;

COMMENT ON COLUMN public.sessions.created_by_admin_email IS
    'Lowercase corporate admin email that originally created the session.';
COMMENT ON COLUMN public.sessions.last_edited_by_admin_email IS
    'Lowercase corporate admin email that last edited or cancelled the session.';
COMMENT ON COLUMN public.sessions.last_hosted_by_admin_email IS
    'Lowercase corporate admin email that most recently started/joined hosting for the session.';
COMMENT ON COLUMN public.sessions.last_hosted_at IS
    'Timestamp of the latest successful host start/join action by an authorized admin.';
