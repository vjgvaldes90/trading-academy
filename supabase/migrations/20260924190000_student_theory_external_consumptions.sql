-- External Theory class consumptions (admin-recorded classes taught outside the Academy).
-- Shares the Full Program max-2 quota window with student_theory_consumptions.
-- Does NOT create fake sessions / session_id rows.
-- Do NOT auto-apply from the app; run via your usual Supabase migration process after explicit approval.
--
-- Inspected baseline (current repo):
--   supabase/migrations/20260911140000_student_theory_consumptions.sql
--   claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) RETURNS text
--   lock: pg_advisory_xact_lock(hashtext('theory_quota:' || student_id::text))

-- ---------------------------------------------------------------------------
-- 1. External consumption ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_theory_external_consumptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.trading_students (id) ON DELETE CASCADE,
    billing_period_start timestamptz NOT NULL,
    billing_period_end timestamptz NOT NULL,
    class_held_on date NOT NULL,
    notes text NULL,
    recorded_by_admin_email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    reversed_at timestamptz NULL,
    reversed_by_admin_email text NULL,
    reversal_reason text NULL,
    CONSTRAINT student_theory_external_consumptions_period_ordered
        CHECK (billing_period_end > billing_period_start)
);

COMMENT ON TABLE public.student_theory_external_consumptions IS
    'Admin-recorded Theory classes taught outside Smart Option Academy. Active rows (reversed_at IS NULL) count toward the same max-2 Full Program quota window as student_theory_consumptions. Soft-reverse only; never hard-delete.';

COMMENT ON COLUMN public.student_theory_external_consumptions.class_held_on IS
    'Calendar date the external theory class was held (ops record; not a sessions.id).';

COMMENT ON COLUMN public.student_theory_external_consumptions.reversed_at IS
    'NULL = active quota unit. Non-NULL = soft-reversed; excluded from quota counts.';

-- Active lookups by student + persisted period (second-precision match done in SQL helpers/RPCs).
CREATE INDEX IF NOT EXISTS idx_student_theory_external_consumptions_student_period_active
    ON public.student_theory_external_consumptions (student_id, billing_period_start, billing_period_end)
    WHERE reversed_at IS NULL;

-- Same hardening pattern as student_theory_consumptions (ENABLE+FORCE RLS; SELECT-only service_role).
ALTER TABLE public.student_theory_external_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_theory_external_consumptions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.student_theory_external_consumptions FROM PUBLIC;
REVOKE ALL ON TABLE public.student_theory_external_consumptions FROM anon;
REVOKE ALL ON TABLE public.student_theory_external_consumptions FROM authenticated;
REVOKE ALL ON TABLE public.student_theory_external_consumptions FROM service_role;

GRANT SELECT ON TABLE public.student_theory_external_consumptions TO service_role;

-- Product decision: no UNIQUE (student_id, class_held_on). Same-day duplicates allowed;
-- combined Academy + active external cap remains max 2 per persisted period.

-- ---------------------------------------------------------------------------
-- 2. Shared quota-unit helper (Academy + active external)
-- ---------------------------------------------------------------------------
-- Internal only: used by claim RPCs under the per-student advisory lock.
-- Not granted to anon/authenticated/service_role (no PostgREST client bypass).

CREATE OR REPLACE FUNCTION public.theory_quota_units_in_period(
    p_student_id uuid,
    p_period_start timestamptz,
    p_period_end timestamptz
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        (
            SELECT COUNT(*)::integer
            FROM public.student_theory_consumptions c
            WHERE c.student_id = p_student_id
              AND date_trunc('second', c.billing_period_start)
                    = date_trunc('second', p_period_start)
              AND date_trunc('second', c.billing_period_end)
                    = date_trunc('second', p_period_end)
        )
        +
        (
            SELECT COUNT(*)::integer
            FROM public.student_theory_external_consumptions e
            WHERE e.student_id = p_student_id
              AND e.reversed_at IS NULL
              AND date_trunc('second', e.billing_period_start)
                    = date_trunc('second', p_period_start)
              AND date_trunc('second', e.billing_period_end)
                    = date_trunc('second', p_period_end)
        )
    )::integer;
$$;

ALTER FUNCTION public.theory_quota_units_in_period(uuid, timestamptz, timestamptz) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.theory_quota_units_in_period(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.theory_quota_units_in_period(uuid, timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.theory_quota_units_in_period(uuid, timestamptz, timestamptz) FROM authenticated;
REVOKE ALL ON FUNCTION public.theory_quota_units_in_period(uuid, timestamptz, timestamptz) FROM service_role;

COMMENT ON FUNCTION public.theory_quota_units_in_period(uuid, timestamptz, timestamptz) IS
    'Internal: Academy ledger rows + active external rows in the given period (second-precision). Used only by SECURITY DEFINER claim RPCs. Not granted to clients.';

-- ---------------------------------------------------------------------------
-- 3. claim_theory_consumption — same signature/returns; count includes externals
-- ---------------------------------------------------------------------------
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
    -- Same lock key as external claim/reverse RPCs.
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

    -- Combined Academy + active external units against the persisted period (max 2).
    v_count := public.theory_quota_units_in_period(p_student_id, v_period_start, v_period_end);

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

COMMENT ON FUNCTION public.claim_theory_consumption(uuid, uuid, timestamptz, timestamptz) IS
    'Atomic Theory quota claim for live Academy sessions. Counts Academy + active external units (max 2). Requires persisted theory_quota_period_*; rejects non-theory sessions and mismatched period bounds. Lock: theory_quota:{student_id}.';

-- ---------------------------------------------------------------------------
-- 4. claim_theory_external_consumption
-- ---------------------------------------------------------------------------
-- Period bounds are loaded from trading_students (authoritative); not trusted from the client.
-- Returns jsonb: status + optional id / counts.

CREATE OR REPLACE FUNCTION public.claim_theory_external_consumption(
    p_student_id uuid,
    p_class_held_on date,
    p_notes text,
    p_recorded_by_admin_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_email text;
    v_notes text;
    v_plan text;
    v_access_type text;
    v_period_start timestamptz;
    v_period_end timestamptz;
    v_count integer;
    v_academy integer;
    v_external integer;
    v_inserted uuid;
BEGIN
    v_admin_email := nullif(trim(coalesce(p_recorded_by_admin_email, '')), '');
    v_notes := nullif(trim(coalesce(p_notes, '')), '');

    IF p_student_id IS NULL OR p_class_held_on IS NULL OR v_admin_email IS NULL THEN
        RETURN jsonb_build_object('status', 'invalid_args');
    END IF;

    -- Same per-student lock as claim_theory_consumption / reverse_theory_external_consumption.
    PERFORM pg_advisory_xact_lock(hashtext('theory_quota:' || p_student_id::text));

    SELECT
        lower(trim(coalesce(s.plan, ''))),
        lower(trim(coalesce(s.access_type, 'paid'))),
        s.theory_quota_period_start,
        s.theory_quota_period_end
    INTO v_plan, v_access_type, v_period_start, v_period_end
    FROM public.trading_students s
    WHERE s.id = p_student_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'student_not_found');
    END IF;

    -- Defense-in-depth: Free students are not eligible for admin external registration.
    IF v_access_type = 'free' THEN
        RETURN jsonb_build_object('status', 'free_not_allowed');
    END IF;

    IF v_plan IS DISTINCT FROM 'full_program' THEN
        RETURN jsonb_build_object('status', 'not_full_program');
    END IF;

    IF v_period_start IS NULL OR v_period_end IS NULL OR v_period_end <= v_period_start THEN
        RETURN jsonb_build_object('status', 'period_not_configured');
    END IF;

    v_count := public.theory_quota_units_in_period(p_student_id, v_period_start, v_period_end);

    SELECT COUNT(*)::integer
    INTO v_academy
    FROM public.student_theory_consumptions c
    WHERE c.student_id = p_student_id
      AND date_trunc('second', c.billing_period_start) = date_trunc('second', v_period_start)
      AND date_trunc('second', c.billing_period_end) = date_trunc('second', v_period_end);

    SELECT COUNT(*)::integer
    INTO v_external
    FROM public.student_theory_external_consumptions e
    WHERE e.student_id = p_student_id
      AND e.reversed_at IS NULL
      AND date_trunc('second', e.billing_period_start) = date_trunc('second', v_period_start)
      AND date_trunc('second', e.billing_period_end) = date_trunc('second', v_period_end);

    IF v_count >= 2 THEN
        RETURN jsonb_build_object(
            'status', 'quota_exceeded',
            'total', v_count,
            'academy', v_academy,
            'external', v_external
        );
    END IF;

    INSERT INTO public.student_theory_external_consumptions (
        student_id,
        billing_period_start,
        billing_period_end,
        class_held_on,
        notes,
        recorded_by_admin_email
    )
    VALUES (
        p_student_id,
        v_period_start,
        v_period_end,
        p_class_held_on,
        v_notes,
        v_admin_email
    )
    RETURNING id INTO v_inserted;

    v_external := v_external + 1;
    v_count := v_academy + v_external;

    RETURN jsonb_build_object(
        'status', 'ok',
        'id', v_inserted,
        'total', v_count,
        'academy', v_academy,
        'external', v_external
    );
END;
$$;

ALTER FUNCTION public.claim_theory_external_consumption(uuid, date, text, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.claim_theory_external_consumption(uuid, date, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_theory_external_consumption(uuid, date, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_theory_external_consumption(uuid, date, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_theory_external_consumption(uuid, date, text, text) TO service_role;

COMMENT ON FUNCTION public.claim_theory_external_consumption(uuid, date, text, text) IS
    'Admin-record one external Theory class against the student persisted quota window. Rejects Free / non-full_program. Lock: theory_quota:{student_id}. Returns jsonb status: ok | quota_exceeded | free_not_allowed | not_full_program | period_not_configured | student_not_found | invalid_args.';

-- ---------------------------------------------------------------------------
-- 5. reverse_theory_external_consumption (soft reverse only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reverse_theory_external_consumption(
    p_external_id uuid,
    p_reversed_by_admin_email text,
    p_reversal_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_email text;
    v_reason text;
    v_student_id uuid;
    v_reversed_at timestamptz;
    v_period_start timestamptz;
    v_period_end timestamptz;
    v_count integer;
    v_academy integer;
    v_external integer;
BEGIN
    v_admin_email := nullif(trim(coalesce(p_reversed_by_admin_email, '')), '');
    v_reason := nullif(trim(coalesce(p_reversal_reason, '')), '');

    IF p_external_id IS NULL OR v_admin_email IS NULL OR v_reason IS NULL THEN
        RETURN jsonb_build_object('status', 'invalid_args');
    END IF;

    -- Load student_id first so we can take the shared quota lock before mutating.
    SELECT e.student_id
    INTO v_student_id
    FROM public.student_theory_external_consumptions e
    WHERE e.id = p_external_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('theory_quota:' || v_student_id::text));

    -- Re-read under lock (FOR UPDATE) so concurrent claim/reverse cannot race.
    SELECT e.student_id, e.reversed_at, e.billing_period_start, e.billing_period_end
    INTO v_student_id, v_reversed_at, v_period_start, v_period_end
    FROM public.student_theory_external_consumptions e
    WHERE e.id = p_external_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    IF v_reversed_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already_reversed',
            'id', p_external_id
        );
    END IF;

    UPDATE public.student_theory_external_consumptions
    SET
        reversed_at = now(),
        reversed_by_admin_email = v_admin_email,
        reversal_reason = v_reason
    WHERE id = p_external_id
      AND reversed_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'already_reversed',
            'id', p_external_id
        );
    END IF;

    v_count := public.theory_quota_units_in_period(v_student_id, v_period_start, v_period_end);

    SELECT COUNT(*)::integer
    INTO v_academy
    FROM public.student_theory_consumptions c
    WHERE c.student_id = v_student_id
      AND date_trunc('second', c.billing_period_start) = date_trunc('second', v_period_start)
      AND date_trunc('second', c.billing_period_end) = date_trunc('second', v_period_end);

    SELECT COUNT(*)::integer
    INTO v_external
    FROM public.student_theory_external_consumptions e
    WHERE e.student_id = v_student_id
      AND e.reversed_at IS NULL
      AND date_trunc('second', e.billing_period_start) = date_trunc('second', v_period_start)
      AND date_trunc('second', e.billing_period_end) = date_trunc('second', v_period_end);

    RETURN jsonb_build_object(
        'status', 'ok',
        'id', p_external_id,
        'total', v_count,
        'academy', v_academy,
        'external', v_external
    );
END;
$$;

ALTER FUNCTION public.reverse_theory_external_consumption(uuid, text, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reverse_theory_external_consumption(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_theory_external_consumption(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.reverse_theory_external_consumption(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_theory_external_consumption(uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.reverse_theory_external_consumption(uuid, text, text) IS
    'Soft-reverse an external Theory consumption (never hard-delete). Lock: theory_quota:{student_id}. Returns jsonb status: ok | not_found | already_reversed | invalid_args.';
