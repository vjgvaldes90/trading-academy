-- Academy Announcements: one-way admin → student notices + read receipts

CREATE TABLE IF NOT EXISTS public.academy_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    message text NOT NULL,
    priority text NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('normal', 'important', 'critical')),
    published boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES auth.users (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_announcement_reads (
    announcement_id uuid NOT NULL
        REFERENCES public.academy_announcements (id) ON DELETE CASCADE,
    student_id uuid NOT NULL
        REFERENCES public.trading_students (id) ON DELETE CASCADE,
    read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (announcement_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_academy_announcements_created_at
    ON public.academy_announcements (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_academy_announcements_published
    ON public.academy_announcements (published);

CREATE INDEX IF NOT EXISTS idx_academy_announcements_priority
    ON public.academy_announcements (priority);

CREATE INDEX IF NOT EXISTS idx_academy_announcement_reads_student_id
    ON public.academy_announcement_reads (student_id);

CREATE INDEX IF NOT EXISTS idx_academy_announcement_reads_announcement_id
    ON public.academy_announcement_reads (announcement_id);

CREATE OR REPLACE FUNCTION public.set_academy_announcements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_announcements_updated_at ON public.academy_announcements;
CREATE TRIGGER trg_academy_announcements_updated_at
    BEFORE UPDATE ON public.academy_announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.set_academy_announcements_updated_at();

ALTER TABLE public.academy_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_select_published_announcements"
    ON public.academy_announcements;
CREATE POLICY "students_select_published_announcements"
    ON public.academy_announcements
    FOR SELECT
    TO authenticated
    USING (published = true);

DROP POLICY IF EXISTS "students_select_own_announcement_reads"
    ON public.academy_announcement_reads;
CREATE POLICY "students_select_own_announcement_reads"
    ON public.academy_announcement_reads
    FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT ts.id
            FROM public.trading_students AS ts
            WHERE lower(ts.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );

DROP POLICY IF EXISTS "students_insert_own_announcement_reads"
    ON public.academy_announcement_reads;
CREATE POLICY "students_insert_own_announcement_reads"
    ON public.academy_announcement_reads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id IN (
            SELECT ts.id
            FROM public.trading_students AS ts
            WHERE lower(ts.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );

DROP POLICY IF EXISTS "students_update_own_announcement_reads"
    ON public.academy_announcement_reads;
CREATE POLICY "students_update_own_announcement_reads"
    ON public.academy_announcement_reads
    FOR UPDATE
    TO authenticated
    USING (
        student_id IN (
            SELECT ts.id
            FROM public.trading_students AS ts
            WHERE lower(ts.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
    WITH CHECK (
        student_id IN (
            SELECT ts.id
            FROM public.trading_students AS ts
            WHERE lower(ts.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    );

COMMENT ON TABLE public.academy_announcements IS
    'One-way academy announcements (admin create; students read published). Admin writes via service role.';
COMMENT ON TABLE public.academy_announcement_reads IS
    'Per-student read receipts for academy_announcements.';
