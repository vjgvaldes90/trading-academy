-- Soft delete: keep session rows for history; hide cancelled from listings that use status.

ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

COMMENT ON COLUMN public.sessions.status IS
    'active = normal; cancelled = soft-deleted (no new bookings; row retained).';

-- Align RPC with public behaviour: only aggregate active sessions.
CREATE OR REPLACE FUNCTION public.get_sessions_with_bookings()
RETURNS TABLE (
    id uuid,
    date date,
    time text,
    capacity integer,
    booked integer
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        s.id,
        COALESCE(s.session_date, s.date)::date AS date,
        COALESCE(s.session_hour, s.time)::text AS time,
        COALESCE(s.capacity, 0)::integer AS capacity,
        COALESCE(
            COUNT(b.id) FILTER (WHERE b.status = 'active'),
            0
        )::integer AS booked
    FROM public.sessions AS s
    LEFT JOIN public.bookings AS b
        ON b.session_id = s.id
    WHERE s.status = 'active'
    GROUP BY
        s.id,
        COALESCE(s.session_date, s.date),
        COALESCE(s.session_hour, s.time),
        COALESCE(s.capacity, 0)
    ORDER BY
        COALESCE(s.session_date, s.date) ASC,
        COALESCE(s.session_hour, s.time) ASC;
$$;
