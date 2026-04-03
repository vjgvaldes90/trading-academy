-- Single-use magic login tokens (e.g. email CTA after Stripe payment).
-- Apply in Supabase: SQL Editor, or `supabase db push` if you use the CLI.

CREATE TABLE IF NOT EXISTS public.magic_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_tokens_token ON public.magic_tokens (token);
CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires_at ON public.magic_tokens (expires_at);

ALTER TABLE public.magic_tokens ENABLE ROW LEVEL SECURITY;

-- Anon/auth roles: no policies (access only via service role in server routes).
