-- Temporary: allow anon client inserts/selects without JWT while booking is client-side.
-- Re-enable RLS with reviewed policies when ready.

ALTER TABLE public.tradingbookings DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_tradingbookings" ON public.tradingbookings;
DROP POLICY IF EXISTS "anon_select_tradingbookings" ON public.tradingbookings;
