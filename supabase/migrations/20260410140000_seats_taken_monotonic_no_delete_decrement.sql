-- seats_taken must never decrement from tradingbookings DELETE (cancellations not releasing seats yet).
-- Only INSERT on tradingbookings increments seats_taken.

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
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_tradingbookings_seats_taken ON public.tradingbookings;
CREATE TRIGGER trg_tradingbookings_seats_taken
    AFTER INSERT ON public.tradingbookings
    FOR EACH ROW
    EXECUTE FUNCTION public.tradingbookings_sync_seats_taken();
