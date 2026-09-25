/**
 * Admin Theory Planning helpers used by the quota board.
 * Read-only against Academy + external theory ledgers in the persisted window.
 * Never claims or inserts quota consumptions.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
    THEORY_QUOTA_MAX_CLASSES,
    loadTheoryQuotaLedgersForStudents,
    loadTheoryQuotaSummaryForStudent,
    summarizeTheoryQuotaInPersistedWindow,
    theoryQuotaRemaining,
    type TheoryQuotaExternalEntry,
    type TheoryQuotaWindowSummary,
} from "@/lib/theoryQuotaLedger"

export { THEORY_QUOTA_MAX_CLASSES }
export {
    loadTheoryQuotaLedgersForStudents,
    loadTheoryQuotaSummaryForStudent,
    summarizeTheoryQuotaInPersistedWindow,
    theoryQuotaRemaining,
}
export type { TheoryQuotaWindowSummary }
export type TheoryQuotaBoardExternalEntry = TheoryQuotaExternalEntry

/**
 * Count Academy + active external units in the student's persisted window.
 * If the external table is not migrated yet, treats external as 0.
 */
export async function countTheoryConsumptionsInPersistedWindow(
    supabase: SupabaseClient,
    studentId: string,
    periodStart: Date,
    periodEnd: Date
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
    const summary = await loadTheoryQuotaSummaryForStudent(
        supabase,
        studentId,
        periodStart,
        periodEnd
    )
    if (!summary.ok) return summary
    return { ok: true, count: summary.summary.total_consumed }
}

export type TheoryQuotaBoardStudent = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    plan: string
    period_start: string | null
    period_end: string | null
    /** Kept for existing UI compatibility — same as total_consumed. */
    consumed: number
    academy_consumed: number
    external_consumed: number
    total_consumed: number
    pending: number
    remaining: number
    quota_max: number
    is_active: boolean
    externals: TheoryQuotaBoardExternalEntry[]
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
 * Classify by combined ledger units in the persisted window (0 / 1 / 2).
 */
export function classifyTheoryQuotaBoardBucket(
    consumed: number
): TheoryQuotaBoardBucket | "over" {
    if (consumed === 0) return "pending_2"
    if (consumed === 1) return "pending_1"
    if (consumed === 2) return "pending_0"
    return "over"
}

export function emptyTheoryQuotaBoardFields(): Pick<
    TheoryQuotaBoardStudent,
    | "consumed"
    | "academy_consumed"
    | "external_consumed"
    | "total_consumed"
    | "pending"
    | "remaining"
    | "externals"
> {
    return {
        consumed: 0,
        academy_consumed: 0,
        external_consumed: 0,
        total_consumed: 0,
        pending: THEORY_QUOTA_MAX_CLASSES,
        remaining: THEORY_QUOTA_MAX_CLASSES,
        externals: [],
    }
}
