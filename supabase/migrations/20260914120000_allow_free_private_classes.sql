-- Allow Admin-created free Private Classes (price_cents = 0) alongside paid ($250).
-- Does not change paid request defaults or existing rows.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.

ALTER TABLE public.private_class_requests
    DROP CONSTRAINT IF EXISTS private_class_requests_price_check;

ALTER TABLE public.private_class_requests
    ADD CONSTRAINT private_class_requests_price_check
        CHECK (price_cents IN (0, 25000));

COMMENT ON COLUMN public.private_class_requests.price_cents IS
    '25000 = paid Private Class ($250). 0 = admin-created free class (no Stripe).';

COMMENT ON COLUMN public.private_class_requests.stripe_payment_status IS
    'Stripe payment_status snapshot (e.g. paid), or ''free'' for admin-created complimentary classes.';
