/**
 * Admin Theory Class Planning helpers.
 * Read-only against student_theory_consumptions / theory_quota_period_*.
 * Never claims or inserts quota consumptions.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { parseTheoryPeriodBounds, sameBillingInstant } from "@/lib/theoryClassQuota"
import { resolveSubscriptionPlan } from "@/lib/subscriptionPlans"
import { z } from "zod"

export const THEORY_PLANNING_STATUSES = [
    "draft",
    "scheduled",
    "completed",
    "cancelled",
] as const

export type TheoryPlanningStatus = (typeof THEORY_PLANNING_STATUSES)[number]

export const THEORY_PLANNING_ACTIVE_STATUSES = ["draft", "scheduled"] as const

export const THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED = 5

export const THEORY_PLANNING_GROUP_SELECT =
    "id, title, status, theory_slot, tentative_date, tentative_time, confirmed_date, confirmed_time, session_id, admin_notes, created_by_admin_email, updated_by_admin_email, created_at, updated_at" as const

export const THEORY_PLANNING_MEMBER_SELECT =
    "id, group_id, student_id, added_by_admin_email, added_at" as const

export type TheoryPlanningGroupRow = {
    id: string
    title: string | null
    status: string
    theory_slot: number
    tentative_date: string | null
    tentative_time: string | null
    confirmed_date: string | null
    confirmed_time: string | null
    session_id: string | null
    admin_notes: string | null
    created_by_admin_email: string | null
    updated_by_admin_email: string | null
    created_at: string
    updated_at: string
}

export type TheoryPlanningMemberRow = {
    id: string
    group_id: string
    student_id: string
    added_by_admin_email: string | null
    added_at: string
}

export type TheoryPlanningMemberWithStudent = TheoryPlanningMemberRow & {
    email: string | null
    first_name: string | null
    last_name: string | null
}

export function isTheoryPlanningStatus(value: string): value is TheoryPlanningStatus {
    return (THEORY_PLANNING_STATUSES as readonly string[]).includes(value)
}

export function isTheoryPlanningActiveStatus(status: string): boolean {
    return (THEORY_PLANNING_ACTIVE_STATUSES as readonly string[]).includes(status)
}

export function parseTheorySlot(raw: unknown): 1 | 2 | null {
    if (raw === 1 || raw === "1") return 1
    if (raw === 2 || raw === "2") return 2
    return null
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/

export const createTheoryPlanningGroupSchema = z
    .object({
        theory_slot: z.union([z.literal(1), z.literal(2), z.literal("1"), z.literal("2")]),
        title: z.string().trim().max(200).nullable().optional(),
        admin_notes: z.string().trim().max(2000).nullable().optional(),
        tentative_date: z.string().regex(dateRegex).nullable().optional(),
        tentative_time: z.string().regex(timeRegex).nullable().optional(),
        confirmed_date: z.string().regex(dateRegex).nullable().optional(),
        confirmed_time: z.string().regex(timeRegex).nullable().optional(),
    })
    .superRefine((val, ctx) => {
        const tHasDate =
            typeof val.tentative_date === "string" && val.tentative_date.trim() !== ""
        const tHasTime =
            typeof val.tentative_time === "string" && val.tentative_time.trim() !== ""
        if (tHasDate !== tHasTime) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "tentative_date and tentative_time must both be set or both omitted",
            })
        }
        const cHasDate =
            typeof val.confirmed_date === "string" && val.confirmed_date.trim() !== ""
        const cHasTime =
            typeof val.confirmed_time === "string" && val.confirmed_time.trim() !== ""
        if (cHasDate !== cHasTime) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "confirmed_date and confirmed_time must both be set or both omitted",
            })
        }
    })

export const patchTheoryPlanningGroupSchema = z
    .object({
        title: z.string().trim().max(200).nullable().optional(),
        admin_notes: z.string().trim().max(2000).nullable().optional(),
        status: z.enum(THEORY_PLANNING_STATUSES).optional(),
        tentative_date: z.string().regex(dateRegex).nullable().optional(),
        tentative_time: z.string().regex(timeRegex).nullable().optional(),
        confirmed_date: z.string().regex(dateRegex).nullable().optional(),
        confirmed_time: z.string().regex(timeRegex).nullable().optional(),
        session_id: z.string().uuid().nullable().optional(),
    })
    .superRefine((val, ctx) => {
        const keys = Object.keys(val)
        if (keys.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "No fields to update" })
        }
        const tDateProvided = Object.prototype.hasOwnProperty.call(val, "tentative_date")
        const tTimeProvided = Object.prototype.hasOwnProperty.call(val, "tentative_time")
        if (tDateProvided || tTimeProvided) {
            if (!tDateProvided || !tTimeProvided) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "tentative_date and tentative_time must be updated together",
                })
            } else {
                const d = val.tentative_date
                const t = val.tentative_time
                const bothNull = d === null && t === null
                const bothSet =
                    typeof d === "string" && d.trim() !== "" && typeof t === "string" && t.trim() !== ""
                if (!bothNull && !bothSet) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "tentative_date and tentative_time must both be set or both null",
                    })
                }
            }
        }
        const cDateProvided = Object.prototype.hasOwnProperty.call(val, "confirmed_date")
        const cTimeProvided = Object.prototype.hasOwnProperty.call(val, "confirmed_time")
        if (cDateProvided || cTimeProvided) {
            if (!cDateProvided || !cTimeProvided) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "confirmed_date and confirmed_time must be updated together",
                })
            } else {
                const d = val.confirmed_date
                const t = val.confirmed_time
                const bothNull = d === null && t === null
                const bothSet =
                    typeof d === "string" && d.trim() !== "" && typeof t === "string" && t.trim() !== ""
                if (!bothNull && !bothSet) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "confirmed_date and confirmed_time must both be set or both null",
                    })
                }
            }
        }
    })

export const addTheoryPlanningMemberSchema = z.object({
    student_id: z.string().uuid(),
})

export const theoryPlanningGroupIdSchema = z.string().uuid()

/** Normalize HH:MM or HH:MM:SS for storage. */
export function normalizePlanningTime(raw: string): string {
    const t = raw.trim()
    if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`
    return t
}

/**
 * Count ledger rows in the student's persisted first-$450 window.
 * Read-only; filters with second-precision matching (same as claim RPC).
 */
export async function countTheoryConsumptionsInPersistedWindow(
    supabase: SupabaseClient,
    studentId: string,
    periodStart: Date,
    periodEnd: Date
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
    const { data, error } = await supabase
        .from("student_theory_consumptions")
        .select("id, billing_period_start, billing_period_end")
        .eq("student_id", studentId)

    if (error) {
        return { ok: false, error: error.message }
    }

    let count = 0
    for (const row of data ?? []) {
        const startRaw =
            typeof row.billing_period_start === "string" ? row.billing_period_start : null
        const endRaw = typeof row.billing_period_end === "string" ? row.billing_period_end : null
        const bounds = parseTheoryPeriodBounds(startRaw, endRaw)
        if (!bounds) continue
        if (
            sameBillingInstant(bounds.start, periodStart) &&
            sameBillingInstant(bounds.end, periodEnd)
        ) {
            count += 1
        }
    }
    return { ok: true, count }
}

export type TheorySlotEligibility =
    | { ok: true; used: number; theory_slot: 1 | 2 }
    | {
          ok: false
          code:
              | "not_full_program"
              | "period_not_configured"
              | "slot_mismatch"
              | "quota_exhausted"
              | "lookup_failed"
          error: string
          used?: number
      }

/**
 * Strict slot rules (approved):
 * slot 1 ↔ used === 0; slot 2 ↔ used === 1.
 * Uses only persisted theory_quota_period_* — never invents or persists periods.
 */
export async function evaluateTheorySlotEligibility(
    supabase: SupabaseClient,
    studentId: string,
    theorySlot: 1 | 2
): Promise<TheorySlotEligibility> {
    const { data: student, error } = await supabase
        .from("trading_students")
        .select("id, plan, theory_quota_period_start, theory_quota_period_end")
        .eq("id", studentId)
        .maybeSingle()

    if (error) {
        return { ok: false, code: "lookup_failed", error: "Failed to load student" }
    }
    if (!student) {
        return { ok: false, code: "lookup_failed", error: "Student not found" }
    }

    if (resolveSubscriptionPlan(student.plan as string | null) !== "full_program") {
        return {
            ok: false,
            code: "not_full_program",
            error: "Student is not on Full Program",
        }
    }

    const period = parseTheoryPeriodBounds(
        student.theory_quota_period_start as string | null,
        student.theory_quota_period_end as string | null
    )
    if (!period) {
        return {
            ok: false,
            code: "period_not_configured",
            error: "First $450 theory quota period is not configured for this student",
        }
    }

    const counted = await countTheoryConsumptionsInPersistedWindow(
        supabase,
        studentId,
        period.start,
        period.end
    )
    if (!counted.ok) {
        return { ok: false, code: "lookup_failed", error: counted.error }
    }

    const used = counted.count
    if (used >= 2) {
        return {
            ok: false,
            code: "quota_exhausted",
            error: "Theory class quota already exhausted",
            used,
        }
    }
    if (theorySlot === 1 && used !== 0) {
        return {
            ok: false,
            code: "slot_mismatch",
            error: "Slot 1 requires zero theory consumptions in the first $450 window",
            used,
        }
    }
    if (theorySlot === 2 && used !== 1) {
        return {
            ok: false,
            code: "slot_mismatch",
            error: "Slot 2 requires exactly one theory consumption in the first $450 window",
            used,
        }
    }

    return { ok: true, used, theory_slot: theorySlot }
}

/**
 * True if student is already in another draft/scheduled group for the same slot.
 */
export async function findActiveMembershipForSlot(
    supabase: SupabaseClient,
    studentId: string,
    theorySlot: 1 | 2,
    excludeGroupId?: string
): Promise<
    | { ok: true; membership: { group_id: string; group_status: string } | null }
    | { ok: false; error: string }
> {
    const { data: memberships, error: memErr } = await supabase
        .from("theory_planning_group_members")
        .select("group_id")
        .eq("student_id", studentId)

    if (memErr) {
        return { ok: false, error: memErr.message }
    }

    const groupIds = (memberships ?? [])
        .map((m) => (typeof m.group_id === "string" ? m.group_id : ""))
        .filter(Boolean)
        .filter((id) => (excludeGroupId ? id !== excludeGroupId : true))

    if (groupIds.length === 0) {
        return { ok: true, membership: null }
    }

    const { data: groups, error: gErr } = await supabase
        .from("theory_planning_groups")
        .select("id, status, theory_slot")
        .in("id", groupIds)
        .eq("theory_slot", theorySlot)
        .in("status", [...THEORY_PLANNING_ACTIVE_STATUSES])

    if (gErr) {
        return { ok: false, error: gErr.message }
    }

    const hit = (groups ?? [])[0]
    if (!hit || typeof hit.id !== "string") {
        return { ok: true, membership: null }
    }

    return {
        ok: true,
        membership: {
            group_id: hit.id,
            group_status: typeof hit.status === "string" ? hit.status : "",
        },
    }
}

export async function countGroupMembers(
    supabase: SupabaseClient,
    groupId: string
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
    const { count, error } = await supabase
        .from("theory_planning_group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)

    if (error) {
        return { ok: false, error: error.message }
    }
    return { ok: true, count: count ?? 0 }
}

export function serializeTheoryPlanningGroup(
    row: TheoryPlanningGroupRow,
    extras?: { member_count?: number; members?: TheoryPlanningMemberWithStudent[] }
) {
    return {
        id: row.id,
        title: row.title,
        status: row.status,
        theory_slot: row.theory_slot,
        tentative_date: row.tentative_date,
        tentative_time: row.tentative_time,
        confirmed_date: row.confirmed_date,
        confirmed_time: row.confirmed_time,
        session_id: row.session_id,
        admin_notes: row.admin_notes,
        created_by_admin_email: row.created_by_admin_email,
        updated_by_admin_email: row.updated_by_admin_email,
        created_at: row.created_at,
        updated_at: row.updated_at,
        member_count: extras?.member_count ?? extras?.members?.length ?? 0,
        members: extras?.members ?? undefined,
    }
}
