-- Atomic session booking with capacity check (prevents overbooking under concurrency).
-- Called from the app server with service_role (not exposed to anon).

ALTER TABLE public.trading_sessions
    ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 10;

DELETE FROM public.tradingbookings
WHERE session_id IS NULL;

ALTER TABLE public.tradingbookings
    ALTER COLUMN session_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tradingbookings_session_email
    ON public.tradingbookings (session_id, email)
    WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.book_session(p_session_id uuid, p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cap   integer;
    v_cnt   bigint;
    v_out   integer;
BEGIN
    IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
        RAISE EXCEPTION 'EMAIL_REQUIRED' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(ts.capacity, 10)
    INTO v_cap
    FROM public.trading_sessions AS ts
    WHERE ts.id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO v_cnt
    FROM public.tradingbookings
    WHERE session_id = p_session_id;

    IF v_cnt >= v_cap THEN
        RAISE EXCEPTION 'CAPACITY_REACHED' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.tradingbookings (session_id, email)
    VALUES (p_session_id, lower(trim(p_email)));

    SELECT COUNT(*)::integer INTO v_out
    FROM public.tradingbookings
    WHERE session_id = p_session_id;

    RETURN v_out;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.book_session(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_session(uuid, text) TO service_role;

COMMENT ON FUNCTION public.book_session(uuid, text) IS
    'Locks session row, checks capacity vs tradingbookings count, inserts one booking; raises CAPACITY_REACHED / ALREADY_BOOKED on conflict.';
