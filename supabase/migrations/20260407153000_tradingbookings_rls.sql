-- Booking flow uses custom email+code session cookie, not Supabase Auth.
-- Keep tradingbookings without auth.uid() dependency.
ALTER TABLE public.tradingbookings DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own booking" ON public.tradingbookings;
DROP POLICY IF EXISTS "Users can view own booking" ON public.tradingbookings;
DROP POLICY IF EXISTS "Users can delete own booking" ON public.tradingbookings;
