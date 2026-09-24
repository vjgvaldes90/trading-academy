/**
 * Admin Theory Planning helpers used by the quota board.
 * Read-only against student_theory_consumptions / theory_quota_period_*.
 * Never claims or inserts quota consumptions.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { parseTheoryPeriodBounds, sameBillingInstant } from "@/lib/theoryClassQuota"

/** Max distinct theory sessions in the first Full Program quota window. */
export const THEORY_QUOTA_MAX_CLASSES = 2

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

export type TheoryQuotaBoardStudent = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    plan: string
    period_start: string | null
    period_end: string | null
    consumed: number
    remaining: number
    quota_max: number
    is_active: boolean
}

export type TheoryQuotaBoardNonEligible = TheoryQuotaBoardStudent & {
    reason:
        | "theory_access_denied"
        | "period_not_configured"
        | "quota_over"
        | "lookup_failed"
}

export type TheoryQuotaBoardBucket = "pending_2" | "pending_1" | "pending_0"

/**
 * Classify an eligible Full Program student by ledger consumptions in the
 * persisted quota window. Mutually exclusive for consumed 0 / 1 / 2.
 * Does not invent periods or claim consumptions.
 */
export function classifyTheoryQuotaBoardBucket(
    consumed: number
): TheoryQuotaBoardBucket | "over" {
    if (consumed === 0) return "pending_2"
    if (consumed === 1) return "pending_1"
    if (consumed === 2) return "pending_0"
    return "over"
}

export function theoryQuotaRemaining(consumed: number): number {
    if (consumed <= 0) return THEORY_QUOTA_MAX_CLASSES
    if (consumed >= THEORY_QUOTA_MAX_CLASSES) return 0
    return THEORY_QUOTA_MAX_CLASSES - consumed
}
