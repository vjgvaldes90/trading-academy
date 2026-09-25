/**
 * Read-only combined Theory quota ledger counting (Academy + active external).
 * Shared by admin quota board and join preview. Writes remain DB-RPC authoritative.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { parseTheoryPeriodBounds, sameBillingInstant } from "@/lib/theoryPeriod"

export const THEORY_QUOTA_MAX_CLASSES = 2

export type PeriodLedgerRow = {
    billing_period_start: string | null
    billing_period_end: string | null
}

export type TheoryQuotaExternalLedgerRow = PeriodLedgerRow & {
    id: string
    class_held_on: string | null
    notes: string | null
    recorded_by_admin_email: string | null
    created_at: string | null
    reversed_at: string | null
    reversed_by_admin_email: string | null
    reversal_reason: string | null
}

export type TheoryQuotaExternalEntry = {
    id: string
    class_held_on: string
    notes: string | null
    recorded_by_admin_email: string
    created_at: string
    reversed_at: string | null
    reversed_by_admin_email: string | null
    reversal_reason: string | null
}

export type TheoryQuotaWindowSummary = {
    academy_consumed: number
    external_consumed: number
    total_consumed: number
    pending: number
    remaining: number
    externals: TheoryQuotaExternalEntry[]
}

function isMissingRelationError(message: string): boolean {
    const m = message.toLowerCase()
    return (
        m.includes("does not exist") ||
        m.includes("could not find the table") ||
        m.includes("schema cache") ||
        m.includes("could not find the relationship")
    )
}

function rowMatchesPersistedPeriod(
    row: PeriodLedgerRow,
    periodStart: Date,
    periodEnd: Date
): boolean {
    const startRaw =
        typeof row.billing_period_start === "string" ? row.billing_period_start : null
    const endRaw = typeof row.billing_period_end === "string" ? row.billing_period_end : null
    const bounds = parseTheoryPeriodBounds(startRaw, endRaw)
    if (!bounds) return false
    return (
        sameBillingInstant(bounds.start, periodStart) &&
        sameBillingInstant(bounds.end, periodEnd)
    )
}

function isActiveExternal(row: Pick<TheoryQuotaExternalLedgerRow, "reversed_at">): boolean {
    return row.reversed_at == null || String(row.reversed_at).trim() === ""
}

export function theoryQuotaRemaining(consumed: number): number {
    if (consumed <= 0) return THEORY_QUOTA_MAX_CLASSES
    if (consumed >= THEORY_QUOTA_MAX_CLASSES) return 0
    return THEORY_QUOTA_MAX_CLASSES - consumed
}

function toExternalEntry(row: TheoryQuotaExternalLedgerRow): TheoryQuotaExternalEntry | null {
    if (typeof row.id !== "string" || !row.id.trim()) return null
    const classHeldOn =
        typeof row.class_held_on === "string" && row.class_held_on.trim()
            ? row.class_held_on.trim().slice(0, 10)
            : ""
    if (!classHeldOn) return null
    const recordedBy =
        typeof row.recorded_by_admin_email === "string" && row.recorded_by_admin_email.trim()
            ? row.recorded_by_admin_email.trim()
            : ""
    if (!recordedBy) return null
    const createdAt =
        typeof row.created_at === "string" && row.created_at.trim() ? row.created_at.trim() : ""
    if (!createdAt) return null

    return {
        id: row.id,
        class_held_on: classHeldOn,
        notes: typeof row.notes === "string" && row.notes.trim() ? row.notes.trim() : null,
        recorded_by_admin_email: recordedBy,
        created_at: createdAt,
        reversed_at:
            typeof row.reversed_at === "string" && row.reversed_at.trim()
                ? row.reversed_at.trim()
                : null,
        reversed_by_admin_email:
            typeof row.reversed_by_admin_email === "string" &&
            row.reversed_by_admin_email.trim()
                ? row.reversed_by_admin_email.trim()
                : null,
        reversal_reason:
            typeof row.reversal_reason === "string" && row.reversal_reason.trim()
                ? row.reversal_reason.trim()
                : null,
    }
}

export function summarizeTheoryQuotaInPersistedWindow(
    academyRows: PeriodLedgerRow[],
    externalRows: TheoryQuotaExternalLedgerRow[],
    periodStart: Date,
    periodEnd: Date
): TheoryQuotaWindowSummary {
    let academy = 0
    for (const row of academyRows) {
        if (rowMatchesPersistedPeriod(row, periodStart, periodEnd)) academy += 1
    }

    let externalActive = 0
    const externals: TheoryQuotaExternalEntry[] = []
    for (const row of externalRows) {
        if (!rowMatchesPersistedPeriod(row, periodStart, periodEnd)) continue
        const entry = toExternalEntry(row)
        if (entry) externals.push(entry)
        if (isActiveExternal(row)) externalActive += 1
    }

    const total = academy + externalActive
    const remaining = theoryQuotaRemaining(total)
    return {
        academy_consumed: academy,
        external_consumed: externalActive,
        total_consumed: total,
        pending: remaining,
        remaining,
        externals,
    }
}

export async function loadTheoryQuotaSummaryForStudent(
    supabase: SupabaseClient,
    studentId: string,
    periodStart: Date,
    periodEnd: Date
): Promise<
    { ok: true; summary: TheoryQuotaWindowSummary } | { ok: false; error: string }
> {
    const { data: academyData, error: academyError } = await supabase
        .from("student_theory_consumptions")
        .select("id, billing_period_start, billing_period_end")
        .eq("student_id", studentId)

    if (academyError) {
        return { ok: false, error: academyError.message }
    }

    const { data: externalData, error: externalError } = await supabase
        .from("student_theory_external_consumptions")
        .select(
            "id, billing_period_start, billing_period_end, class_held_on, notes, recorded_by_admin_email, created_at, reversed_at, reversed_by_admin_email, reversal_reason"
        )
        .eq("student_id", studentId)

    let externalRows: TheoryQuotaExternalLedgerRow[] = []
    if (externalError) {
        if (!isMissingRelationError(externalError.message)) {
            return { ok: false, error: externalError.message }
        }
        // Phase A migration not applied yet — Academy-only fallback.
        externalRows = []
    } else {
        externalRows = (externalData ?? []) as TheoryQuotaExternalLedgerRow[]
    }

    return {
        ok: true,
        summary: summarizeTheoryQuotaInPersistedWindow(
            (academyData ?? []) as PeriodLedgerRow[],
            externalRows,
            periodStart,
            periodEnd
        ),
    }
}

export async function loadTheoryQuotaLedgersForStudents(
    supabase: SupabaseClient,
    studentIds: string[]
): Promise<
    | {
          ok: true
          academyByStudent: Map<string, PeriodLedgerRow[]>
          externalByStudent: Map<string, TheoryQuotaExternalLedgerRow[]>
      }
    | { ok: false; error: string }
> {
    const academyByStudent = new Map<string, PeriodLedgerRow[]>()
    const externalByStudent = new Map<string, TheoryQuotaExternalLedgerRow[]>()
    for (const id of studentIds) {
        academyByStudent.set(id, [])
        externalByStudent.set(id, [])
    }
    if (studentIds.length === 0) {
        return { ok: true, academyByStudent, externalByStudent }
    }

    const { data: academyData, error: academyError } = await supabase
        .from("student_theory_consumptions")
        .select("student_id, billing_period_start, billing_period_end")
        .in("student_id", studentIds)

    if (academyError) {
        return { ok: false, error: academyError.message }
    }

    for (const row of academyData ?? []) {
        const sid = typeof row.student_id === "string" ? row.student_id : ""
        if (!sid || !academyByStudent.has(sid)) continue
        academyByStudent.get(sid)!.push({
            billing_period_start:
                typeof row.billing_period_start === "string" ? row.billing_period_start : null,
            billing_period_end:
                typeof row.billing_period_end === "string" ? row.billing_period_end : null,
        })
    }

    const { data: externalData, error: externalError } = await supabase
        .from("student_theory_external_consumptions")
        .select(
            "id, student_id, billing_period_start, billing_period_end, class_held_on, notes, recorded_by_admin_email, created_at, reversed_at, reversed_by_admin_email, reversal_reason"
        )
        .in("student_id", studentIds)

    if (externalError) {
        if (!isMissingRelationError(externalError.message)) {
            return { ok: false, error: externalError.message }
        }
        return { ok: true, academyByStudent, externalByStudent }
    }

    for (const row of externalData ?? []) {
        const sid = typeof row.student_id === "string" ? row.student_id : ""
        if (!sid || !externalByStudent.has(sid)) continue
        externalByStudent.get(sid)!.push(row as TheoryQuotaExternalLedgerRow)
    }

    return { ok: true, academyByStudent, externalByStudent }
}
