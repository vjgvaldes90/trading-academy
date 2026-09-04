-- Idempotency for Stripe webhook handlers (event.id).
-- Additive only. Does not alter trading_students.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    event_id text PRIMARY KEY,
    event_type text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_webhook_events IS
    'Stripe Event ids claimed/processed by the app webhook handler for idempotency.';

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
    ON public.stripe_webhook_events (processed_at);
