-- lessons.class_date is a calendar day chosen by the admin, not an instant.
-- Stored as timestamptz it was midnight UTC and browsers west of UTC showed the previous day.
-- Every existing value is midnight UTC, so the UTC date is exactly the day the admin picked.
-- created_at is untouched (it is a real instant).

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.lessons
        WHERE class_date IS NOT NULL
          AND (class_date AT TIME ZONE 'UTC')::time <> TIME '00:00'
    ) THEN
        RAISE EXCEPTION 'lessons.class_date has non-midnight UTC values; converting to date would change their day';
    END IF;
END
$$;

ALTER TABLE public.lessons
    ALTER COLUMN class_date TYPE date
    USING (class_date AT TIME ZONE 'UTC')::date;

COMMENT ON COLUMN public.lessons.class_date IS
    'Calendar day of the class (YYYY-MM-DD, no time zone; optional; distinct from created_at).';
