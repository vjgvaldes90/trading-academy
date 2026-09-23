-- Admin App Web Push subscriptions (Phase 1: storage only; no send yet).
-- Privileged access only via service_role from Next.js admin APIs.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process after review.

CREATE TABLE IF NOT EXISTS public.admin_push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT admin_push_subscriptions_endpoint_unique UNIQUE (endpoint),
    CONSTRAINT admin_push_subscriptions_admin_email_nonempty
        CHECK (length(trim(admin_email)) > 0),
    CONSTRAINT admin_push_subscriptions_endpoint_nonempty
        CHECK (length(trim(endpoint)) > 0),
    CONSTRAINT admin_push_subscriptions_p256dh_nonempty
        CHECK (length(trim(p256dh)) > 0),
    CONSTRAINT admin_push_subscriptions_auth_nonempty
        CHECK (length(trim(auth)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_admin_push_subscriptions_admin_email
    ON public.admin_push_subscriptions (admin_email);

CREATE INDEX IF NOT EXISTS idx_admin_push_subscriptions_updated_at
    ON public.admin_push_subscriptions (updated_at DESC);

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_push_subscriptions FORCE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: deny all client access.
REVOKE ALL ON TABLE public.admin_push_subscriptions FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_push_subscriptions FROM anon;
REVOKE ALL ON TABLE public.admin_push_subscriptions FROM authenticated;
REVOKE ALL ON TABLE public.admin_push_subscriptions FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_push_subscriptions TO service_role;

COMMENT ON TABLE public.admin_push_subscriptions IS
    'Web Push subscriptions for Admin App PWA. Access only via service_role from authenticated admin APIs. Do not expose to students or browser clients.';
