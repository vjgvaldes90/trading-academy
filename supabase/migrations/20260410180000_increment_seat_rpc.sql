-- RPC name used by POST /api/reserve-seat (wraps existing atomic increment).
CREATE OR REPLACE FUNCTION public.increment_seat(session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.reserve_trading_session_seat(session_id);
$$;

REVOKE ALL ON FUNCTION public.increment_seat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_seat(uuid) TO service_role;
