-- RLS stays ON; permissive insert/update so server-side clients using keys subject to RLS
-- (or future edge functions with user JWT) can upsert. Service role bypasses RLS in Supabase,
-- but these policies fix cases where inserts were denied under RLS without policies.

ALTER TABLE public.trading_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow inserts for webhook" ON public.trading_students;
CREATE POLICY "Allow inserts for webhook"
    ON public.trading_students
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updates for webhook" ON public.trading_students;
CREATE POLICY "Allow updates for webhook"
    ON public.trading_students
    FOR UPDATE
    USING (true);
