-- Private Class 1:1 requests (Stage 1: request + admin approve/reject/cancel).
-- Stripe / Zoom columns intentionally omitted until later stages.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.

CREATE TABLE IF NOT EXISTS public.private_class_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.trading_students (id) ON DELETE CASCADE,
    student_email text NOT NULL,
    requested_date date NOT NULL,
    requested_time time NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 120,
    price_cents integer NOT NULL DEFAULT 25000,
    currency text NOT NULL DEFAULT 'usd',
    status text NOT NULL DEFAULT 'pending',
    student_message text NULL,
    admin_notes text NULL,
    approved_by_admin_email text NULL,
    rejected_by_admin_email text NULL,
    approved_at timestamptz NULL,
    rejected_at timestamptz NULL,
    cancelled_at timestamptz NULL,
    completed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT private_class_requests_status_check
        CHECK (status IN (
            'pending',
            'rejected',
            'awaiting_payment',
            'paid',
            'confirmed',
            'completed',
            'cancelled'
        )),
    CONSTRAINT private_class_requests_duration_check
        CHECK (duration_minutes = 120),
    CONSTRAINT private_class_requests_price_check
        CHECK (price_cents = 25000),
    CONSTRAINT private_class_requests_currency_check
        CHECK (currency = 'usd')
);

CREATE INDEX IF NOT EXISTS private_class_requests_student_id_idx
    ON public.private_class_requests (student_id);

CREATE INDEX IF NOT EXISTS private_class_requests_student_email_idx
    ON public.private_class_requests (student_email);

CREATE INDEX IF NOT EXISTS private_class_requests_status_idx
    ON public.private_class_requests (status);

CREATE INDEX IF NOT EXISTS private_class_requests_created_at_idx
    ON public.private_class_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS private_class_requests_requested_slot_idx
    ON public.private_class_requests (requested_date, requested_time);

CREATE OR REPLACE FUNCTION public.set_private_class_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_class_requests_updated_at ON public.private_class_requests;
CREATE TRIGGER trg_private_class_requests_updated_at
    BEFORE UPDATE ON public.private_class_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_private_class_requests_updated_at();

ALTER TABLE public.private_class_requests DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.private_class_requests IS
    'Private Class 1:1 requests ($250 / 2h). Access enforced in application layer. Stripe/Zoom in later stages.';

COMMENT ON COLUMN public.private_class_requests.status IS
    'pending | rejected | awaiting_payment | paid | confirmed | completed | cancelled';
