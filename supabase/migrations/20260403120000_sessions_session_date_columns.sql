-- Sessions: canonical calendar column + display fields + optional row closure.
-- Safe to run if columns already use new names (branches no-op).

ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS is_booked boolean NOT NULL DEFAULT false;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessions'
          AND column_name = 'date'
    )
       AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessions'
          AND column_name = 'session_date'
    ) THEN
        ALTER TABLE public.sessions RENAME COLUMN date TO session_date;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessions'
          AND column_name = 'day'
    )
       AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessions'
          AND column_name = 'session_day'
    ) THEN
        ALTER TABLE public.sessions RENAME COLUMN day TO session_day;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessions'
          AND column_name = 'time'
    )
       AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessions'
          AND column_name = 'session_hour'
    ) THEN
        ALTER TABLE public.sessions RENAME COLUMN time TO session_hour;
    END IF;
END $$;
