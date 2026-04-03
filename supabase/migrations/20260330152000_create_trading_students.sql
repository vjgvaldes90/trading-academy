CREATE TABLE IF NOT EXISTS public.trading_students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    first_name text,
    last_name text,
    phone text,
    profile_completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trading_students_email
    ON public.trading_students (email);

