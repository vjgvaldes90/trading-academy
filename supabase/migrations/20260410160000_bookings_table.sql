-- Canonical booking row (session + email); dashboard may also use tradingbookings.
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.trading_sessions (id) ON DELETE CASCADE,
    user_email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bookings_session_user_email_unique UNIQUE (session_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON public.bookings (session_id);

ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
