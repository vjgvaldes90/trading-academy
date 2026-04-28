ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS session_link text,
    ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.sessions.session_link IS
    'Private live-session URL (Meet/Zoom). Returned only to paid/authenticated academy users.';

COMMENT ON COLUMN public.sessions.is_live IS
    'Computed/live state hint. UI still enforces join availability window.';
