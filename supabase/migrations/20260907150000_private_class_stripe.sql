-- Private Class Stage 3: Stripe one-time payment tracking.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text NULL;

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text NULL;

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS stripe_payment_status text NULL;

ALTER TABLE public.private_class_requests
  ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;

-- One Checkout Session ID maps to at most one request (NULLs allowed multiple times in Postgres UNIQUE).
CREATE UNIQUE INDEX IF NOT EXISTS private_class_requests_stripe_checkout_session_id_uidx
  ON public.private_class_requests (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS private_class_requests_stripe_payment_intent_id_idx
  ON public.private_class_requests (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS private_class_requests_paid_at_idx
  ON public.private_class_requests (paid_at DESC)
  WHERE paid_at IS NOT NULL;

COMMENT ON COLUMN public.private_class_requests.stripe_checkout_session_id IS
  'Stripe Checkout Session id for Private Class one-time payment (mode=payment).';

COMMENT ON COLUMN public.private_class_requests.stripe_payment_intent_id IS
  'Stripe PaymentIntent id once available from Checkout.';

COMMENT ON COLUMN public.private_class_requests.stripe_payment_status IS
  'Stripe payment_status snapshot (e.g. paid).';

COMMENT ON COLUMN public.private_class_requests.paid_at IS
  'When webhook confirmed awaiting_payment → paid.';
