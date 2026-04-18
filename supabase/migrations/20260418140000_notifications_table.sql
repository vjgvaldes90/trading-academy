-- In-app notifications for students (e.g. session updated / cancelled).

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text NOT NULL,
    message text NOT NULL,
    "read" boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_email, "read", created_at DESC);

ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.notifications IS
    'Student-facing notices; populated when admin changes sessions for booked users.';
