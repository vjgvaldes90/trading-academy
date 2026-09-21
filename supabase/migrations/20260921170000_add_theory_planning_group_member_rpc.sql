-- Atomic add of a student to a theory planning group (admin ops).
-- Serializes concurrent adds for the same (student_id, theory_slot) via advisory xact lock.
-- Locks the target group row FOR UPDATE so status cannot flip to cancelled/completed mid-insert.
-- Does NOT touch trading_students, student_theory_consumptions, sessions, or Stripe.
-- Slot quota eligibility remains enforced in the admin API (read-only) before calling this RPC.
-- DO NOT auto-apply from the app; run via your usual Supabase migration process after explicit approval.

CREATE OR REPLACE FUNCTION public.add_theory_planning_group_member(
    p_group_id uuid,
    p_student_id uuid,
    p_added_by_admin_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status text;
    v_theory_slot smallint;
    v_admin_email text;
    v_member_id uuid;
    v_conflict_group_id uuid;
    v_conflict_status text;
    v_existing_id uuid;
BEGIN
    v_admin_email := nullif(trim(coalesce(p_added_by_admin_email, '')), '');

    IF p_group_id IS NULL OR p_student_id IS NULL OR v_admin_email IS NULL THEN
        RETURN jsonb_build_object('status', 'invalid_args');
    END IF;

    -- Lock the target group row for the duration of this transaction so a concurrent
    -- status change (e.g. draft/scheduled → cancelled) cannot slip in before INSERT.
    SELECT g.status, g.theory_slot
    INTO v_status, v_theory_slot
    FROM public.theory_planning_groups g
    WHERE g.id = p_group_id
    FOR UPDATE OF g;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'group_not_found');
    END IF;

    IF v_theory_slot IS DISTINCT FROM 1 AND v_theory_slot IS DISTINCT FROM 2 THEN
        RETURN jsonb_build_object('status', 'invalid_args');
    END IF;

    -- Re-check while holding the group row lock.
    IF v_status NOT IN ('draft', 'scheduled') THEN
        RETURN jsonb_build_object(
            'status', 'group_not_active',
            'group_status', v_status
        );
    END IF;

    -- Serialize membership mutations for this student + theory_slot (xact-scoped).
    PERFORM pg_advisory_xact_lock(
        hashtext('theory_planning_slot:' || p_student_id::text),
        v_theory_slot::integer
    );

    -- Already a member of this group.
    SELECT m.id
    INTO v_existing_id
    FROM public.theory_planning_group_members m
    WHERE m.group_id = p_group_id
      AND m.student_id = p_student_id;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already',
            'member_id', v_existing_id
        );
    END IF;

    -- Conflict: another active group for the same slot.
    SELECT g.id, g.status
    INTO v_conflict_group_id, v_conflict_status
    FROM public.theory_planning_group_members m
    INNER JOIN public.theory_planning_groups g ON g.id = m.group_id
    WHERE m.student_id = p_student_id
      AND g.id IS DISTINCT FROM p_group_id
      AND g.theory_slot = v_theory_slot
      AND g.status IN ('draft', 'scheduled')
    LIMIT 1;

    IF v_conflict_group_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'conflict_active_slot',
            'group_id', v_conflict_group_id,
            'group_status', v_conflict_status,
            'theory_slot', v_theory_slot
        );
    END IF;

    INSERT INTO public.theory_planning_group_members (
        group_id,
        student_id,
        added_by_admin_email
    )
    VALUES (
        p_group_id,
        p_student_id,
        v_admin_email
    )
    ON CONFLICT (group_id, student_id) DO NOTHING
    RETURNING id INTO v_member_id;

    IF v_member_id IS NULL THEN
        -- Concurrent same-group insert won; treat as already.
        SELECT m.id
        INTO v_existing_id
        FROM public.theory_planning_group_members m
        WHERE m.group_id = p_group_id
          AND m.student_id = p_student_id;

        RETURN jsonb_build_object(
            'status', 'already',
            'member_id', v_existing_id
        );
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'member_id', v_member_id
    );
END;
$$;

ALTER FUNCTION public.add_theory_planning_group_member(uuid, uuid, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.add_theory_planning_group_member(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_theory_planning_group_member(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.add_theory_planning_group_member(uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.add_theory_planning_group_member(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.add_theory_planning_group_member(uuid, uuid, text) IS
    'Atomically add a student to a theory planning group. Locks group row FOR UPDATE; advisory-locks (student, theory_slot). Does not touch theory quota / consumptions. Returns jsonb status: ok | already | conflict_active_slot | group_not_found | group_not_active | invalid_args.';
