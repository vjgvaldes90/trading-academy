import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import {
    evaluateTheoryAccess,
    normalizeAccessType,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"
import { resolveSubscriptionPlan } from "@/lib/subscriptionPlans"
import { parseTheoryPeriodBounds } from "@/lib/theoryClassQuota"
import {
    THEORY_QUOTA_MAX_CLASSES,
    classifyTheoryQuotaBoardBucket,
    countTheoryConsumptionsInPersistedWindow,
    theoryQuotaRemaining,
    type TheoryQuotaBoardNonEligible,
    type TheoryQuotaBoardStudent,
} from "@/lib/theoryPlanning"

export const runtime = "nodejs"

/**
 * Read-only Full Program theory quota board for Admin Planning.
 * Excludes Free students (board-only); does not change live theory access.
 * Counts only student_theory_consumptions in the persisted first-window bounds.
 * Does not invent periods, claim consumptions, or touch group membership.
 */
export async function GET() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const supabase = createSupabaseServiceRoleClient()
        const { data: students, error } = await supabase
            .from("trading_students")
            .select(
                "id, email, first_name, last_name, plan, access_type, is_active, access_expires_at, program_theory_until, theory_quota_period_start, theory_quota_period_end, subscription_id, subscription_status"
            )
            .eq("plan", "full_program")
            .order("created_at", { ascending: false })
            .limit(2000)

        if (error) {
            console.error("[api/admin/theory-planning/quota-board] GET", error.message)
            return NextResponse.json({ error: "Failed to load students" }, { status: 500 })
        }

        const pending2: TheoryQuotaBoardStudent[] = []
        const pending1: TheoryQuotaBoardStudent[] = []
        const pending0: TheoryQuotaBoardStudent[] = []
        const nonEligible: TheoryQuotaBoardNonEligible[] = []

        for (const row of students ?? []) {
            if (typeof row.id !== "string" || typeof row.email !== "string") continue
            if (isAuthorizedAdminEmail(row.email)) continue
            if (resolveSubscriptionPlan(row.plan as string | null) !== "full_program") continue
            // Admin quota board only: Free + Full Program retain live theory access, but are omitted here.
            if (normalizeAccessType(row.access_type as string | null) === "free") continue

            const accessRow = row as TradingStudentAccessRow
            const theory = evaluateTheoryAccess(accessRow)
            const period = parseTheoryPeriodBounds(
                row.theory_quota_period_start as string | null,
                row.theory_quota_period_end as string | null
            )

            const base: TheoryQuotaBoardStudent = {
                id: row.id,
                email: row.email,
                first_name: typeof row.first_name === "string" ? row.first_name : null,
                last_name: typeof row.last_name === "string" ? row.last_name : null,
                plan: "full_program",
                period_start: period ? period.start.toISOString() : null,
                period_end: period ? period.end.toISOString() : null,
                consumed: 0,
                remaining: THEORY_QUOTA_MAX_CLASSES,
                quota_max: THEORY_QUOTA_MAX_CLASSES,
                is_active: row.is_active !== false,
            }

            if (!theory.ok) {
                nonEligible.push({
                    ...base,
                    reason: "theory_access_denied",
                })
                continue
            }

            if (!period) {
                nonEligible.push({
                    ...base,
                    reason: "period_not_configured",
                })
                continue
            }

            const counted = await countTheoryConsumptionsInPersistedWindow(
                supabase,
                row.id,
                period.start,
                period.end
            )
            if (!counted.ok) {
                console.error(
                    "[api/admin/theory-planning/quota-board] count failed",
                    counted.error
                )
                nonEligible.push({
                    ...base,
                    reason: "lookup_failed",
                })
                continue
            }

            const consumed = counted.count
            const entry: TheoryQuotaBoardStudent = {
                ...base,
                consumed,
                remaining: theoryQuotaRemaining(consumed),
            }

            const bucket = classifyTheoryQuotaBoardBucket(consumed)
            if (bucket === "pending_2") pending2.push(entry)
            else if (bucket === "pending_1") pending1.push(entry)
            else if (bucket === "pending_0") pending0.push(entry)
            else {
                nonEligible.push({
                    ...entry,
                    remaining: 0,
                    reason: "quota_over",
                })
            }
        }

        const eligibleTotal = pending2.length + pending1.length + pending0.length

        return NextResponse.json({
            pending_2: pending2,
            pending_1: pending1,
            pending_0: pending0,
            non_eligible: nonEligible,
            counts: {
                pending_2: pending2.length,
                pending_1: pending1.length,
                pending_0: pending0.length,
                non_eligible: nonEligible.length,
                eligible_total: eligibleTotal,
            },
            quota_max: THEORY_QUOTA_MAX_CLASSES,
        })
    } catch (e) {
        console.error("[api/admin/theory-planning/quota-board] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
