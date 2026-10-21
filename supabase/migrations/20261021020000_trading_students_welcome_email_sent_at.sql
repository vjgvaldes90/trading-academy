-- One welcome email per student. Set only after a successful send.
-- NULL on every existing row, so renewals and profile updates do not email them.
-- created_at and access rules are untouched.

ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz NULL;

COMMENT ON COLUMN public.trading_students.welcome_email_sent_at IS
    'When the enrollment welcome email was sent. NULL means not sent. Not a billing timestamp.';
