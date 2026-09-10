-- Document access_type value used for launch pre-enrollment (no CHECK constraint to alter).
-- Additive documentation only; does not modify existing rows.

COMMENT ON COLUMN public.trading_students.access_type IS
    'paid | free | discounted | discount | vip | pre_enrolled — paid requires access_code; free/discounted/discount/vip/pre_enrolled rely on is_active + optional expiry; pre_enrolled stores selected plan for later Checkout.';
