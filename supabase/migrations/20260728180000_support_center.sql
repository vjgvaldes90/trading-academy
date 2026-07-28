-- Support Center: tickets + threaded messages
-- Sprint 1 — backend infrastructure only.

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.trading_students (id) ON DELETE CASCADE,
    student_email text NOT NULL,
    subject text NOT NULL,
    category text NOT NULL
        CHECK (category IN (
            'login',
            'payment',
            'live_session',
            'recorded_class',
            'technical',
            'account',
            'other'
        )),
    priority text NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status text NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'waiting_student', 'closed')),
    assigned_admin_email text,
    last_message_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.support_tickets (id) ON DELETE CASCADE,
    sender_type text NOT NULL
        CHECK (sender_type IN ('student', 'admin', 'system')),
    sender_email text NOT NULL,
    body text NOT NULL,
    is_internal boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_student_id
    ON public.support_tickets (student_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_student_email
    ON public.support_tickets (student_email);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
    ON public.support_tickets (status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_priority
    ON public.support_tickets (priority);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category
    ON public.support_tickets (category);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
    ON public.support_tickets (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message_at
    ON public.support_tickets (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id
    ON public.support_messages (ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_support_messages_created_at
    ON public.support_messages (created_at DESC);

-- Keep updated_at in sync on ticket row changes.
CREATE OR REPLACE FUNCTION public.set_support_tickets_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_support_tickets_updated_at();

ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.support_tickets IS
    'Student support tickets (Support Center). Access enforced in application layer.';
COMMENT ON TABLE public.support_messages IS
    'Threaded messages for support_tickets. is_internal marks admin-only notes.';
