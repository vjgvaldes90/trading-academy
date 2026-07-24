-- Final cleanup: remove reservation / capacity schema leftovers.
-- Generated for Phase: drop bookings + capacity columns.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process.

-- Views / RPCs that depended on bookings or capacity
DROP VIEW IF EXISTS public.get_sessions_with_bookings CASCADE;
DROP FUNCTION IF EXISTS public.get_sessions_with_bookings() CASCADE;
DROP FUNCTION IF EXISTS public.book_session(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.reserve_seat(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_seat(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.decrement_seat(uuid) CASCADE;

-- Bookings table (no longer used by the application)
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;

-- Current app table: public.sessions
ALTER TABLE IF EXISTS public.sessions
    DROP COLUMN IF EXISTS capacity,
    DROP COLUMN IF EXISTS booked_slots,
    DROP COLUMN IF EXISTS max_slots,
    DROP COLUMN IF EXISTS seats_taken,
    DROP COLUMN IF EXISTS available_spots;

-- Legacy table name (if still present in some environments)
ALTER TABLE IF EXISTS public.trading_sessions
    DROP COLUMN IF EXISTS capacity,
    DROP COLUMN IF EXISTS booked_slots,
    DROP COLUMN IF EXISTS max_slots,
    DROP COLUMN IF EXISTS seats_taken,
    DROP COLUMN IF EXISTS available_spots;
