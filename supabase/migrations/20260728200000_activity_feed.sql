-- Executive Dashboard activity feed (append-only event log).

CREATE TABLE IF NOT EXISTS public.activity_feed (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL
        CHECK (type IN (
            'student_registered',
            'support_ticket_created',
            'booking_created',
            'booking_cancelled',
            'subscription_created',
            'subscription_cancelled',
            'live_session_created'
        )),
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at
    ON public.activity_feed (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_feed_type_created_at
    ON public.activity_feed (type, created_at DESC);

ALTER TABLE public.activity_feed DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.activity_feed IS
    'Append-only activity log for the Admin Executive Dashboard. Access enforced in the application layer.';
