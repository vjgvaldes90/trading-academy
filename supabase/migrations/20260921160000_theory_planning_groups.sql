-- Theory Class Planning (admin-only operational tables).
-- Planning only: does NOT grant, consume, or modify Full Program theory quota.
-- Does NOT write to student_theory_consumptions or trading_students.theory_quota_period_*.
-- Slot eligibility and "min 5 members" / cross-group active-slot rules are enforced in admin API (later).
-- DO NOT auto-apply from the app; run via your usual Supabase migration process after explicit approval.

-- ---------------------------------------------------------------------------
-- theory_planning_groups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.theory_planning_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NULL,
    status text NOT NULL DEFAULT 'draft',
    theory_slot smallint NOT NULL,
    tentative_date date NULL,
    tentative_time time NULL,
    confirmed_date date NULL,
    confirmed_time time NULL,
    session_id uuid NULL REFERENCES public.sessions (id) ON DELETE SET NULL,
    admin_notes text NULL,
    created_by_admin_email text NULL,
    updated_by_admin_email text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT theory_planning_groups_status_check
        CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled')),
    CONSTRAINT theory_planning_groups_theory_slot_check
        CHECK (theory_slot IN (1, 2)),
    CONSTRAINT theory_planning_groups_tentative_pair_check
        CHECK (
            (tentative_date IS NULL AND tentative_time IS NULL)
            OR (tentative_date IS NOT NULL AND tentative_time IS NOT NULL)
        ),
    CONSTRAINT theory_planning_groups_confirmed_pair_check
        CHECK (
            (confirmed_date IS NULL AND confirmed_time IS NULL)
            OR (confirmed_date IS NOT NULL AND confirmed_time IS NOT NULL)
        )
);

COMMENT ON TABLE public.theory_planning_groups IS
    'Admin Theory Class planning groups (Full Program ops). Distinct from live sessions. Does not grant or consume theory quota; student_theory_consumptions remains the entitlement ledger.';

COMMENT ON COLUMN public.theory_planning_groups.status IS
    'draft | scheduled | completed | cancelled — operational planning status only; completed does not mean a theory consumption was recorded.';

COMMENT ON COLUMN public.theory_planning_groups.theory_slot IS
    '1 = first unused theory class in the first $450 window; 2 = second. Slot eligibility is enforced in admin API against student_theory_consumptions (read-only).';

COMMENT ON COLUMN public.theory_planning_groups.session_id IS
    'Optional link to an existing live sessions row (expected session_type=theory in app). NULL = planning-only group. ON DELETE SET NULL keeps the group if the live session is removed.';

COMMENT ON COLUMN public.theory_planning_groups.tentative_date IS
    'Tentative calendar date (America/New_York wall-clock interpreted in app), paired with tentative_time.';

COMMENT ON COLUMN public.theory_planning_groups.confirmed_date IS
    'Confirmed calendar date, paired with confirmed_time.';

-- One live session should not be attached to two planning groups.
CREATE UNIQUE INDEX IF NOT EXISTS theory_planning_groups_session_id_uidx
    ON public.theory_planning_groups (session_id)
    WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS theory_planning_groups_status_idx
    ON public.theory_planning_groups (status);

CREATE INDEX IF NOT EXISTS theory_planning_groups_theory_slot_idx
    ON public.theory_planning_groups (theory_slot);

CREATE INDEX IF NOT EXISTS theory_planning_groups_confirmed_slot_idx
    ON public.theory_planning_groups (confirmed_date, confirmed_time);

CREATE INDEX IF NOT EXISTS theory_planning_groups_created_at_idx
    ON public.theory_planning_groups (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_theory_planning_groups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_theory_planning_groups_updated_at ON public.theory_planning_groups;
CREATE TRIGGER trg_theory_planning_groups_updated_at
    BEFORE UPDATE ON public.theory_planning_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.set_theory_planning_groups_updated_at();

ALTER TABLE public.theory_planning_groups DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- theory_planning_group_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.theory_planning_group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.theory_planning_groups (id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.trading_students (id) ON DELETE CASCADE,
    added_by_admin_email text NULL,
    added_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT theory_planning_group_members_group_student_unique
        UNIQUE (group_id, student_id)
);

COMMENT ON TABLE public.theory_planning_group_members IS
    'Membership of admin theory planning groups. Adding a member does not create or consume student_theory_consumptions rows. Duplicate active-slot membership across groups is enforced in the admin API.';

COMMENT ON COLUMN public.theory_planning_group_members.group_id IS
    'Planning group; CASCADE delete removes memberships when the group is deleted.';

COMMENT ON COLUMN public.theory_planning_group_members.student_id IS
    'trading_students.id (uuid PK). CASCADE matches private_class_requests / student_theory_consumptions.';

CREATE INDEX IF NOT EXISTS theory_planning_group_members_group_id_idx
    ON public.theory_planning_group_members (group_id);

CREATE INDEX IF NOT EXISTS theory_planning_group_members_student_id_idx
    ON public.theory_planning_group_members (student_id);

ALTER TABLE public.theory_planning_group_members DISABLE ROW LEVEL SECURITY;
