-- Idempotent: ensure client inserts are not blocked while debugging (repeat safe).
ALTER TABLE public.tradingbookings DISABLE ROW LEVEL SECURITY;
