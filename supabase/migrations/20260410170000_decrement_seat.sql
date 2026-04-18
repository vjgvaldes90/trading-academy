-- Atomic seats_taken decrement when a booking row is removed (used by DELETE /api/bookings/[id]).
CREATE OR REPLACE FUNCTION public.decrement_seat(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.trading_sessions
    SET seats_taken = GREATEST(0, seats_taken - 1)
    WHERE id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_seat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_seat(uuid) TO service_role;
