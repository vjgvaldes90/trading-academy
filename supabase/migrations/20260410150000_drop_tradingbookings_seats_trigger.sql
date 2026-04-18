-- seats_taken is updated only by increment_seat (via /api/reserve-seat), not by tradingbookings INSERT.
DROP TRIGGER IF EXISTS trg_tradingbookings_seats_taken ON public.tradingbookings;
