-- Admin dashboard notifications (in-app).

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL
        CHECK (type IN (
            'new_student',
            'new_ticket',
            'booking_created',
            'booking_cancelled',
            'subscription_cancelled'
        )),
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
    ON public.admin_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
    ON public.admin_notifications (is_read, created_at DESC)
    WHERE is_read = false;

ALTER TABLE public.admin_notifications DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_notifications IS
    'In-app notifications for the Admin Dashboard. Access enforced in the application layer.';
