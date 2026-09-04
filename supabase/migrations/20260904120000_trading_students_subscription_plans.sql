-- Subscription plan entitlements (Solo Trading vs Programa Completo).
-- Additive only: no backfill, no destructive changes, no DROP.
-- Existing rows keep plan NULL → app treats as legacy trading_only.

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS plan text NULL;

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS program_theory_until timestamptz NULL;

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS subscription_schedule_id text NULL;

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS stripe_price_id text NULL;

COMMENT ON COLUMN public.trading_students.plan IS
    'trading_only | full_program; NULL = legacy Solo Trading (same trading access as trading_only).';

COMMENT ON COLUMN public.trading_students.program_theory_until IS
    'End of theoretical-class entitlement for full_program first period; NULL = no theory access.';

COMMENT ON COLUMN public.trading_students.subscription_schedule_id IS
    'Stripe Subscription Schedule id for full_program (phase $450 then $150); unused until wired.';

COMMENT ON COLUMN public.trading_students.stripe_price_id IS
    'Stripe Price id associated with the student access; unused until wired.';

CREATE INDEX IF NOT EXISTS idx_trading_students_plan
    ON public.trading_students (plan)
    WHERE plan IS NOT NULL;
