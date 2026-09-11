-- Live Theory class consumption ledger (Full Program first billing period quota).
-- Max 2 distinct theory sessions per billing period; enforced at POST /api/session/join.
-- Do NOT auto-apply from the app; run via your usual Supabase migration process.

-- Immutable first $450 billing window for Theory quota (set once at Full Program fulfillment).
ALTER TABLE public.trading_students
    ADD COLUMN IF NOT EXISTS theory_quota_period_start timestamptz,
    ADD COLUMN IF NOT EXISTS theory_quota_period_end timestamptz;

COMMENT ON COLUMN public.trading_students.theory_quota_period_start IS
    'First Full Program $450 billing period start (immutable). Used for live Theory quota.';
COMMENT ON COLUMN public.trading_students.theory_quota_period_end IS
    'First Full Program $450 billing period end (immutable). Aligns with program_theory_until at fulfillment.';

CREATE TABLE IF NOT EXISTS public.student_theory_consumptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.trading_students (id) ON DELETE CASCADE,
    session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
    billing_period_start timestamptz NOT NULL,
    billing_period_end timestamptz NOT NULL,
    consumed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT student_theory_consumptions_student_session_unique UNIQUE (student_id, session_id),
    CONSTRAINT student_theory_consumptions_period_ordered CHECK (billing_period_end > billing_period_start)
);

CREATE INDEX IF NOT EXISTS idx_student_theory_consumptions_student_period
    ON public.student_theory_consumptions (student_id, billing_period_start, billing_period_end);

CREATE INDEX IF NOT EXISTS idx_student_theory_consumptions_session
    ON public.student_theory_consumptions (session_id);

COMMENT ON TABLE public.student_theory_consumptions IS
    'Distinct live Theory (sessions.session_type=theory) joins per Full Program first $450 billing period; max 2 enforced in claim_theory_consumption.';

-- Atomically claim a theory class slot for a student in their persisted first $450 period.
-- Returns: already | ok | quota_exceeded
-- Raises on integrity violations (missing student/period, non-theory session, period mismatch).
CREATE OR REPLACE FUNCTION public.claim_theory_consumption(
    p_student_id uuid,
    p_session_id uuid,
    p_period_start timestamptz,
    p_period_end timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_inserted uuid;
    v_session_type text;
    v_period_start timestamptz;
    v_period_end timestamptz;
BEGIN
    IF p_student_id IS NULL OR p_session_id IS NULL OR p_period_start IS NULL OR p_period_end IS NULL THEN
        RAISE EXCEPTION 'claim_theory_consumption: invalid arguments';
    END IF;
    IF p_period_end <= p_period_start THEN
        RAISE EXCEPTION 'claim_theory_consumption: invalid period bounds';
    END IF;

    -- Serialize claims per student (Theory #1+#2 OK; #3+#4 cannot both insert past 2).
    PERFORM pg_advisory_xact_lock(hashtext('theory_quota:' || p_student_id::text));

    -- Re-entry: existing (student, session) always wins — even at 2/2.
    IF EXISTS (
        SELECT 1
        FROM public.student_theory_consumptions c
        WHERE c.student_id = p_student_id
          AND c.session_id = p_session_id
    ) THEN
        RETURN 'already';
    END IF;

    -- Student must exist (FK would also catch insert; fail early with clear error).
    IF NOT EXISTS (
        SELECT 1
        FROM public.trading_students s
        WHERE s.id = p_student_id
    ) THEN
        RAISE EXCEPTION 'claim_theory_consumption: student not found';
    END IF;

    -- Period must already be persisted; never invent bounds. Caller bounds must match exactly (second precision).
    SELECT s.theory_quota_period_start, s.theory_quota_period_end
    INTO v_period_start, v_period_end
    FROM public.trading_students s
    WHERE s.id = p_student_id;

    IF v_period_start IS NULL OR v_period_end IS NULL THEN
        RAISE EXCEPTION 'claim_theory_consumption: period not configured';
    END IF;

    IF date_trunc('second', v_period_start) IS DISTINCT FROM date_trunc('second', p_period_start)
       OR date_trunc('second', v_period_end) IS DISTINCT FROM date_trunc('second', p_period_end)
    THEN
        RAISE EXCEPTION 'claim_theory_consumption: period mismatch';
    END IF;

    -- Ledger only for live Theory sessions.
    SELECT lower(trim(sess.session_type))
    INTO v_session_type
    FROM public.sessions sess
    WHERE sess.id = p_session_id;

    IF v_session_type IS NULL THEN
        RAISE EXCEPTION 'claim_theory_consumption: session not found';
    END IF;
    IF v_session_type <> 'theory' THEN
        RAISE EXCEPTION 'claim_theory_consumption: session is not theory';
    END IF;

    -- Count against the persisted period only (ignore arbitrary caller-invented windows).
    SELECT COUNT(*)::integer
    INTO v_count
    FROM public.student_theory_consumptions c
    WHERE c.student_id = p_student_id
      AND date_trunc('second', c.billing_period_start) = date_trunc('second', v_period_start)
      AND date_trunc('second', c.billing_period_end) = date_trunc('second', v_period_end);

    IF v_count >= 2 THEN
        RETURN 'quota_exceeded';
    END IF;

    INSERT INTO public.student_theory_consumptions (
        student_id,
        session_id,
        billing_period_start,
        billing_period_end
    )
    VALUES (
        p_student_id,
        p_session_id,
        v_period_start,
        v_period_end
    )
    ON CONFLICT (student_id, session_id) DO NOTHING
    RETURNING id INTO v_inserted;

    IF v_inserted IS NULL THEN
        RETURN 'already';
    END IF;

    RETURN 'ok';
END;
$$;

ALTER FUNCTION public.claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) TO service_role;

-- Harden table: clients cannot touch the ledger; writes only via SECURITY DEFINER RPC.
ALTER TABLE public.student_theory_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_theory_consumptions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.student_theory_consumptions FROM PUBLIC;
REVOKE ALL ON TABLE public.student_theory_consumptions FROM anon;
REVOKE ALL ON TABLE public.student_theory_consumptions FROM authenticated;
REVOKE ALL ON TABLE public.student_theory_consumptions FROM service_role;

-- Preview/join reads existing rows via service_role (BYPASSRLS). No INSERT/UPDATE/DELETE grants.
GRANT SELECT ON TABLE public.student_theory_consumptions TO service_role;

COMMENT ON FUNCTION public.claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) IS
    'Atomic Theory quota claim. Requires persisted theory_quota_period_*; rejects non-theory sessions and mismatched period bounds.';
