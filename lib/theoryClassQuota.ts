/**
 * Full Program live Theory quota: max 2 distinct sessions in the first $450 billing period.
 * Entitlement remains evaluateTheoryAccess / program_theory_until (unchanged).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { createStripeClient } from "@/lib/stripe-server"
import {
    getSubscriptionItemPeriodEndUnix,
    getSubscriptionItemPeriodStartUnix,
    unixSecondsToIso,
} from "@/lib/stripeFullProgramSchedule"
import type { TradingStudentAccessRow } from "@/lib/studentAcademyAccess"

export type TheoryBillingPeriod = {
    start: Date
    end: Date
}

export type TheoryQuotaClaimResult =
    | { ok: true; status: "already" | "claimed" | "available" }
    | { ok: false; code: "theory_quota_exceeded" | "period_unresolved" | "claim_failed"; error: string }

type StudentQuotaRow = TradingStudentAccessRow & {
    id?: string | null
    subscription_id?: string | null
    program_theory_until?: string | null
    theory_quota_period_start?: string | null
    theory_quota_period_end?: string | null
}

/** Compare billing instants at second precision (Stripe unix vs stored ISO). */
export function sameBillingInstant(a: Date, b: Date): boolean {
    return Math.floor(a.getTime() / 1000) === Math.floor(b.getTime() / 1000)
}

export function parseTheoryPeriodBounds(
    startRaw: string | null | undefined,
    endRaw: string | null | undefined
): TheoryBillingPeriod | null {
    if (typeof startRaw !== "string" || !startRaw.trim()) return null
    if (typeof endRaw !== "string" || !endRaw.trim()) return null
    const startMs = Date.parse(startRaw.trim())
    const endMs = Date.parse(endRaw.trim())
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null
    return { start: new Date(startMs), end: new Date(endMs) }
}

/**
 * Prefer immutable persisted first-$450 bounds.
 * Stripe current_period is accepted only while it still matches program_theory_until (first period).
 * Never invent windows (no calendar-month / -31d fallbacks).
 */
export function chooseTheoryQuotaPeriod(args: {
    persisted: TheoryBillingPeriod | null
    stripe: TheoryBillingPeriod | null
    programTheoryUntil: Date | null
}): TheoryBillingPeriod | null {
    if (args.persisted) return args.persisted

    if (args.stripe && args.programTheoryUntil) {
        // Reject $150 (and later) Stripe windows: end must still be the theory entitlement end.
        if (sameBillingInstant(args.stripe.end, args.programTheoryUntil)) {
            return args.stripe
        }
    }

    return null
}

/**
 * Whether Theory join may include join_url for this quota outcome.
 * Preview (consume=false) may only expose join_url for sessions already claimed.
 */
export function theoryJoinUrlAllowed(args: {
    consume: boolean
    status: "already" | "claimed" | "available"
}): boolean {
    if (args.status === "already") return true
    if (args.status === "claimed") return args.consume === true
    // available = quota room but not claimed yet → never return join_url on preview
    return false
}

/**
 * Mirrors claim_theory_consumption integrity guards (no DB).
 * Used by verify:theory-quota — keep aligned with the SQL RPC.
 */
export type ClaimTheoryRpcGuardResult =
    | { ok: true; action: "already" }
    | { ok: true; action: "proceed" }
    | {
          ok: false
          reason:
              | "invalid_args"
              | "student_not_found"
              | "period_not_configured"
              | "period_mismatch"
              | "session_not_found"
              | "session_not_theory"
      }

export function evaluateClaimTheoryRpcGuards(args: {
    studentId: string | null
    sessionId: string | null
    pPeriodStart: Date | null
    pPeriodEnd: Date | null
    studentExists: boolean
    persistedPeriodStart: Date | null
    persistedPeriodEnd: Date | null
    sessionExists: boolean
    sessionType: string | null
    alreadyConsumed: boolean
}): ClaimTheoryRpcGuardResult {
    if (
        !args.studentId ||
        !args.sessionId ||
        !args.pPeriodStart ||
        !args.pPeriodEnd ||
        args.pPeriodEnd.getTime() <= args.pPeriodStart.getTime()
    ) {
        return { ok: false, reason: "invalid_args" }
    }

    // Re-entry before other integrity checks (matches RPC order after lock).
    if (args.alreadyConsumed) {
        return { ok: true, action: "already" }
    }

    if (!args.studentExists) {
        return { ok: false, reason: "student_not_found" }
    }

    if (!args.persistedPeriodStart || !args.persistedPeriodEnd) {
        return { ok: false, reason: "period_not_configured" }
    }

    if (
        !sameBillingInstant(args.persistedPeriodStart, args.pPeriodStart) ||
        !sameBillingInstant(args.persistedPeriodEnd, args.pPeriodEnd)
    ) {
        return { ok: false, reason: "period_mismatch" }
    }

    if (!args.sessionExists || args.sessionType == null) {
        return { ok: false, reason: "session_not_found" }
    }

    if (args.sessionType.trim().toLowerCase() !== "theory") {
        return { ok: false, reason: "session_not_theory" }
    }

    return { ok: true, action: "proceed" }
}

async function persistTheoryQuotaPeriodIfEmpty(args: {
    supabase: SupabaseClient
    studentId: string
    period: TheoryBillingPeriod
}): Promise<TheoryBillingPeriod | null> {
    const startIso = args.period.start.toISOString()
    const endIso = args.period.end.toISOString()
    const { error } = await args.supabase
        .from("trading_students")
        .update({
            theory_quota_period_start: startIso,
            theory_quota_period_end: endIso,
        })
        .eq("id", args.studentId)
        .is("theory_quota_period_start", null)
        .is("theory_quota_period_end", null)

    if (error) {
        console.error("[theoryClassQuota] persist period failed", error)
    }

    // Always re-read — another request may have won the persist race.
    const { data, error: readErr } = await args.supabase
        .from("trading_students")
        .select("theory_quota_period_start, theory_quota_period_end")
        .eq("id", args.studentId)
        .maybeSingle()

    if (readErr) {
        console.error("[theoryClassQuota] re-read period failed", readErr)
        return null
    }

    return parseTheoryPeriodBounds(
        data?.theory_quota_period_start as string | null | undefined,
        data?.theory_quota_period_end as string | null | undefined
    )
}

/**
 * Resolve the immutable first Full Program $450 billing window for Theory quota.
 */
export async function resolveTheoryBillingPeriod(
    student: StudentQuotaRow,
    supabase?: SupabaseClient
): Promise<TheoryBillingPeriod | null> {
    const persisted = parseTheoryPeriodBounds(
        student.theory_quota_period_start,
        student.theory_quota_period_end
    )
    if (persisted) return persisted

    const untilRaw =
        typeof student.program_theory_until === "string" ? student.program_theory_until.trim() : ""
    const untilMs = untilRaw ? Date.parse(untilRaw) : NaN
    const programTheoryUntil = Number.isFinite(untilMs) ? new Date(untilMs) : null

    const subscriptionId =
        typeof student.subscription_id === "string" && student.subscription_id.trim()
            ? student.subscription_id.trim()
            : null

    let stripePeriod: TheoryBillingPeriod | null = null
    if (subscriptionId) {
        try {
            const stripe = createStripeClient()
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            const startUnix = getSubscriptionItemPeriodStartUnix(sub)
            const endUnix = getSubscriptionItemPeriodEndUnix(sub)
            if (startUnix && endUnix && endUnix > startUnix) {
                stripePeriod = {
                    start: new Date(startUnix * 1000),
                    end: new Date(endUnix * 1000),
                }
            }
        } catch (err) {
            console.error("[theoryClassQuota] Stripe period retrieve failed", {
                subscriptionId,
                err,
            })
        }
    }

    const chosen = chooseTheoryQuotaPeriod({
        persisted: null,
        stripe: stripePeriod,
        programTheoryUntil,
    })

    if (!chosen || !supabase) {
        return null
    }

    const studentId = typeof student.id === "string" ? student.id.trim() : ""
    if (!studentId) return null

    // RPC requires persisted bounds — do not claim with ephemeral Stripe-only windows.
    return persistTheoryQuotaPeriodIfEmpty({
        supabase,
        studentId,
        period: chosen,
    })
}

/**
 * Preview or claim a distinct theory session for this student in the first $450 period.
 * `consume=false` never inserts; only reports already / available / exceeded.
 */
export async function assertOrClaimTheoryConsumption(args: {
    supabase: SupabaseClient
    student: StudentQuotaRow
    sessionId: string
    consume: boolean
}): Promise<TheoryQuotaClaimResult> {
    const studentId = typeof args.student.id === "string" ? args.student.id.trim() : ""
    if (!studentId) {
        return { ok: false, code: "claim_failed", error: "Missing student id" }
    }

    const period = await resolveTheoryBillingPeriod(args.student, args.supabase)
    if (!period) {
        return {
            ok: false,
            code: "period_unresolved",
            error: "Could not resolve Full Program first billing period",
        }
    }

    const periodStartIso = period.start.toISOString()
    const periodEndIso = period.end.toISOString()

    const { data: existing, error: existingErr } = await args.supabase
        .from("student_theory_consumptions")
        .select("id")
        .eq("student_id", studentId)
        .eq("session_id", args.sessionId)
        .maybeSingle()

    if (existingErr) {
        console.error("[theoryClassQuota] existing lookup failed", existingErr)
        return { ok: false, code: "claim_failed", error: "Failed to check theory quota" }
    }
    if (existing?.id) {
        return { ok: true, status: "already" }
    }

    if (!args.consume) {
        const { count, error: countErr } = await args.supabase
            .from("student_theory_consumptions")
            .select("id", { count: "exact", head: true })
            .eq("student_id", studentId)
            .eq("billing_period_start", periodStartIso)
            .eq("billing_period_end", periodEndIso)

        if (countErr) {
            console.error("[theoryClassQuota] count failed", countErr)
            return { ok: false, code: "claim_failed", error: "Failed to check theory quota" }
        }
        if ((count ?? 0) >= 2) {
            return {
                ok: false,
                code: "theory_quota_exceeded",
                error: "Theory class quota exceeded",
            }
        }
        return { ok: true, status: "available" }
    }

    const { data: claimStatus, error: claimErr } = await args.supabase.rpc(
        "claim_theory_consumption",
        {
            p_student_id: studentId,
            p_session_id: args.sessionId,
            p_period_start: periodStartIso,
            p_period_end: periodEndIso,
        }
    )

    if (claimErr) {
        console.error("[theoryClassQuota] claim_theory_consumption failed", claimErr)
        return { ok: false, code: "claim_failed", error: "Failed to claim theory quota" }
    }

    const status = typeof claimStatus === "string" ? claimStatus.trim() : ""
    if (status === "already") {
        return { ok: true, status: "already" }
    }
    if (status === "ok") {
        return { ok: true, status: "claimed" }
    }
    if (status === "quota_exceeded") {
        return {
            ok: false,
            code: "theory_quota_exceeded",
            error: "Theory class quota exceeded",
        }
    }

    return { ok: false, code: "claim_failed", error: "Unexpected theory quota claim result" }
}

/** Helpers exported for webhook fulfillment (persist first $450 window once). */
export function theoryQuotaPeriodFromStripeUnix(
    startUnix: number,
    endUnix: number
): { startIso: string; endIso: string } | null {
    if (!Number.isFinite(startUnix) || !Number.isFinite(endUnix) || endUnix <= startUnix) {
        return null
    }
    return {
        startIso: unixSecondsToIso(startUnix),
        endIso: unixSecondsToIso(endUnix),
    }
}
