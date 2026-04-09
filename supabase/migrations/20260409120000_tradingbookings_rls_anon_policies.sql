-- Email-only app: allow anon/authenticated clients to INSERT and SELECT without JWT user rows.
-- Service role still bypasses RLS for server routes.

ALTER TABLE public.tradingbookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_tradingbookings" ON public.tradingbookings;
DROP POLICY IF EXISTS "anon_select_tradingbookings" ON public.tradingbookings;

CREATE POLICY "anon_insert_tradingbookings"
ON public.tradingbookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "anon_select_tradingbookings"
ON public.tradingbookings
FOR SELECT
TO anon, authenticated
USING (true);
