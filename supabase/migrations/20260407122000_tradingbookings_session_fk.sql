-- Ensure tradingbookings has a proper FK to trading_sessions for counting availability.

ALTER TABLE public.tradingbookings
    ADD COLUMN IF NOT EXISTS session_id uuid;

-- Optional backfill when legacy column exists.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tradingbookings'
          AND column_name = 'trading_session_id'
    ) THEN
        UPDATE public.tradingbookings
        SET session_id = trading_session_id
        WHERE session_id IS NULL
          AND trading_session_id IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tradingbookings_session_id
    ON public.tradingbookings (session_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tradingbookings_session_id_fkey'
    ) THEN
        ALTER TABLE public.tradingbookings
            ADD CONSTRAINT tradingbookings_session_id_fkey
            FOREIGN KEY (session_id)
            REFERENCES public.trading_sessions(id)
            ON DELETE CASCADE;
    END IF;
END $$;
