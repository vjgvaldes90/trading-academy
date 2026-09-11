import { isOfficialLaunchStarted } from "@/lib/academyLaunch"
import { getTranslations, readStoredLanguage, type Language } from "@/lib/i18n"
import { hasBlockingSubscription } from "@/lib/preEnrolledCheckoutGate"
import { canAccessTheory, planIncludesTheory } from "@/lib/subscriptionPlans"

/**
 * Academy-wide access (trading_students), independent of live-session join windows.
 * Supported access_type values for admin / product: paid, free, discounted, discount, vip.
 * Launch pre-enrollment uses access_type = "pre_enrolled" (not an admin-assignable type).
 */
export const ACADEMY_ACCESS_TYPES = ["paid", "free", "discounted", "discount", "vip"] as const
export type AcademyAccessType = (typeof ACADEMY_ACCESS_TYPES)[number]

/** Server-assigned only during pre-enrollment window — not in admin allowlists. */
export const PRE_ENROLLED_ACCESS_TYPE = "pre_enrolled" as const
export type PreEnrolledAccessType = typeof PRE_ENROLLED_ACCESS_TYPE

export const LIVE_SESSION_TYPES = ["trading", "theory"] as const
export type LiveSessionType = (typeof LIVE_SESSION_TYPES)[number]

export type TradingStudentAccessRow = {
    id?: string | null
    access_code?: string | null
    access_type?: string | null
    is_active?: boolean | null
    access_expires_at?: string | null
    /** NULL = legacy Solo Trading */
    plan?: string | null
    program_theory_until?: string | null
    /** Immutable first Full Program $450 billing window (Theory quota). */
    theory_quota_period_start?: string | null
    theory_quota_period_end?: string | null
    subscription_id?: string | null
    subscription_status?: string | null
}

export type AcademyAccessEvaluation = {
    ok: boolean
    reason?: "inactive" | "expired" | "unpaid" | "not_found"
}

export type TheoryAccessEvaluation = {
    ok: boolean
    reason?: "inactive" | "expired" | "unpaid" | "not_found" | "no_theory"
}

export type LiveSessionAccessEvaluation = {
    ok: boolean
    reason?: AcademyAccessEvaluation["reason"] | "no_theory" | "invalid_session_type"
    sessionType: LiveSessionType
}

export function normalizeAccessType(raw: string | null | undefined): string {
    return (raw ?? "paid").trim().toLowerCase() || "paid"
}

/** Missing / unknown → trading (legacy rows). */
export function resolveLiveSessionType(raw: unknown): LiveSessionType {
    if (typeof raw === "string") {
        const normalized = raw.trim().toLowerCase()
        if (normalized === "theory") return "theory"
        if (normalized === "trading") return "trading"
    }
    return "trading"
}

export function parseLiveSessionType(raw: unknown):
    | { ok: true; sessionType: LiveSessionType }
    | { ok: false; error: string } {
    if (raw === undefined || raw === null || raw === "") {
        return { ok: true, sessionType: "trading" }
    }
    if (typeof raw !== "string") {
        return {
            ok: false,
            error: 'Invalid session_type. Allowed values: "trading", "theory".',
        }
    }
    const normalized = raw.trim().toLowerCase()
    if (normalized === "trading" || normalized === "theory") {
        return { ok: true, sessionType: normalized }
    }
    return {
        ok: false,
        error: 'Invalid session_type. Allowed values: "trading", "theory".',
    }
}

export function evaluateAcademyAccess(
    row: TradingStudentAccessRow | null | undefined,
    now: Date = new Date()
): AcademyAccessEvaluation {
    if (!row) {
        return { ok: false, reason: "not_found" }
    }

    if (row.is_active === false) {
        return { ok: false, reason: "inactive" }
    }

    const exp = row.access_expires_at
    if (typeof exp === "string" && exp.trim()) {
        const t = Date.parse(exp)
        if (Number.isFinite(t) && t <= now.getTime()) {
            return { ok: false, reason: "expired" }
        }
    }

    const type = normalizeAccessType(row.access_type)

    if (type === PRE_ENROLLED_ACCESS_TYPE) {
        // Before official launch: academy access without payment.
        // After launch: only if a blocking subscription already exists (webhook race / CASE 5).
        if (hasBlockingSubscription(row)) {
            return { ok: true }
        }
        if (!isOfficialLaunchStarted(now)) {
            return { ok: true }
        }
        return { ok: false, reason: "unpaid" }
    }

    if (type === "free" || type === "discounted" || type === "discount" || type === "vip") {
        return { ok: true }
    }

    const code = row.access_code
    if (typeof code === "string" && code.trim().length > 0) {
        return { ok: true }
    }

    return { ok: false, reason: "unpaid" }
}

/**
 * Theory entitlement: academy OK + (pre-launch pre_enrolled full_program OR paid theory window).
 * Enforced by GET /api/lessons and live Theory Classes (list + join).
 *
 * Before official launch (America/New_York): pre_enrolled + full_program may attend theory
 * without program_theory_until (classes may start before Sep 24 payment).
 * After launch: existing canAccessTheory (plan + future program_theory_until) applies.
 */
export function evaluateTheoryAccess(
    row: TradingStudentAccessRow | null | undefined,
    now: Date = new Date()
): TheoryAccessEvaluation {
    const academy = evaluateAcademyAccess(row, now)
    if (!academy.ok) {
        return { ok: false, reason: academy.reason ?? "not_found" }
    }

    const type = normalizeAccessType(row?.access_type)
    if (
        type === PRE_ENROLLED_ACCESS_TYPE &&
        !isOfficialLaunchStarted(now) &&
        planIncludesTheory(row?.plan)
    ) {
        return { ok: true }
    }

    if (
        !canAccessTheory(
            {
                plan: row?.plan,
                program_theory_until: row?.program_theory_until,
            },
            now
        )
    ) {
        return { ok: false, reason: "no_theory" }
    }

    return { ok: true }
}

/**
 * Live session gate by session_type.
 * trading → academy access; theory → evaluateTheoryAccess.
 */
export function evaluateLiveSessionAccess(
    sessionTypeRaw: unknown,
    row: TradingStudentAccessRow | null | undefined,
    now: Date = new Date()
): LiveSessionAccessEvaluation {
    const sessionType = resolveLiveSessionType(sessionTypeRaw)
    if (sessionType === "trading") {
        const academy = evaluateAcademyAccess(row, now)
        return {
            ok: academy.ok,
            reason: academy.reason,
            sessionType,
        }
    }

    const theory = evaluateTheoryAccess(row, now)
    return {
        ok: theory.ok,
        reason: theory.reason,
        sessionType,
    }
}

export function academyAccessDeniedMessage(
    reason: AcademyAccessEvaluation["reason"] | undefined,
    lang?: Language
): string {
    const tr = getTranslations(lang ?? readStoredLanguage())
    switch (reason) {
        case "inactive":
            return tr.accessDeniedInactive
        case "expired":
            return tr.accessDeniedExpired
        case "unpaid":
            return tr.accessDeniedUnpaid
        case "not_found":
        default:
            return tr.accessDeniedNotFound
    }
}

/** @deprecated Prefer academyAccessDeniedMessage */
export function academyAccessDeniedMessageEs(
    reason: AcademyAccessEvaluation["reason"] | undefined
): string {
    return academyAccessDeniedMessage(reason, "es")
}

export function isAllowedAdminAccessType(value: string): value is AcademyAccessType {
    return (ACADEMY_ACCESS_TYPES as readonly string[]).includes(value)
}
