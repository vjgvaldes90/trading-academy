ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS access_code text;

CREATE INDEX IF NOT EXISTS idx_trading_students_access_code
    ON public.trading_students (access_code)
    WHERE access_code IS NOT NULL;
