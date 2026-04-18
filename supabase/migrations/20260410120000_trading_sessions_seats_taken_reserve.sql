-- Seat ledger on trading_sessions: capacity vs seats_taken (checkout hold + bookings via trigger).

ALTER TABLE public.trading_sessions
    ADD COLUMN IF NOT EXISTS seats_taken integer NOT NULL DEFAULT 0 CHECK (seats_taken >= 0);

-- Align with existing booking rows (one-time).
UPDATE public.trading_sessions AS ts
SET seats_taken = COALESCE(sub.cnt, 0)
FROM (
    SELECT session_id, COUNT(*)::integer AS cnt
    FROM public.tradingbookings
    WHERE session_id IS NOT NULL
    GROUP BY session_id
) AS sub
WHERE ts.id = sub.session_id;

-- Atomic: increment only if below capacity (prevents overbooking under concurrency).
CREATE OR REPLACE FUNCTION public.reserve_trading_session_seat(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.trading_sessions
    SET seats_taken = seats_taken + 1
    WHERE id = p_session_id
      AND seats_taken < capacity;
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_trading_session_seat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_trading_session_seat(uuid) TO service_role;

-- Dashboard inserts/deletes on tradingbookings keep seats_taken in sync.
CREATE OR REPLACE FUNCTION public.tradingbookings_sync_seats_taken()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
        UPDATE public.trading_sessions
        SET seats_taken = seats_taken + 1
        WHERE id = NEW.session_id;
    ELSIF TG_OP = 'DELETE' AND OLD.session_id IS NOT NULL THEN
        UPDATE public.trading_sessions
        SET seats_taken = GREATEST(0, seats_taken - 1)
        WHERE id = OLD.session_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tradingbookings_seats_taken ON public.tradingbookings;
CREATE TRIGGER trg_tradingbookings_seats_taken
    AFTER INSERT OR DELETE ON public.tradingbookings
    FOR EACH ROW
    EXECUTE FUNCTION public.tradingbookings_sync_seats_taken();
