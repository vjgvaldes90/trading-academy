-- Academy access control (not per-session payment; gate at student row).

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'paid';

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS access_expires_at timestamptz NULL;

COMMENT ON COLUMN public.trading_students.access_type IS
    'paid | free | discounted | vip — paid requires access_code; others rely on is_active + expiry.';

COMMENT ON COLUMN public.trading_students.is_active IS
    'When false, student cannot log in or use dashboard regardless of access_type.';

COMMENT ON COLUMN public.trading_students.access_expires_at IS
    'Optional entitlement end; when set and in the past, access is denied.';

CREATE INDEX IF NOT EXISTS idx_trading_students_active_email
    ON public.trading_students (email, is_active);
