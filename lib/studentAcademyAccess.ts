import { getTranslations, readStoredLanguage, type Language } from "@/lib/i18n"

/**
 * Academy-wide access (trading_students), independent of live-session join windows.
 * Supported access_type values for admin / product: paid, free, discounted, discount, vip.
 */
export const ACADEMY_ACCESS_TYPES = ["paid", "free", "discounted", "discount", "vip"] as const
export type AcademyAccessType = (typeof ACADEMY_ACCESS_TYPES)[number]

export type TradingStudentAccessRow = {
    access_code?: string | null
    access_type?: string | null
    is_active?: boolean | null
    access_expires_at?: string | null
}

export type AcademyAccessEvaluation = {
    ok: boolean
    /** Machine-readable when ok is false */
    reason?: "inactive" | "expired" | "unpaid" | "not_found"
}

export function normalizeAccessType(raw: string | null | undefined): string {
    return (raw ?? "paid").trim().toLowerCase() || "paid"
}

export function evaluateAcademyAccess(row: TradingStudentAccessRow | null | undefined): AcademyAccessEvaluation {
    if (!row) {
        return { ok: false, reason: "not_found" }
    }

    if (row.is_active === false) {
        return { ok: false, reason: "inactive" }
    }

    const exp = row.access_expires_at
    if (typeof exp === "string" && exp.trim()) {
        const t = Date.parse(exp)
        if (Number.isFinite(t) && t <= Date.now()) {
            return { ok: false, reason: "expired" }
        }
    }

    const type = normalizeAccessType(row.access_type)

    if (type === "free" || type === "discounted" || type === "discount" || type === "vip") {
        return { ok: true }
    }

    const code = row.access_code
    if (typeof code === "string" && code.trim().length > 0) {
        return { ok: true }
    }

    return { ok: false, reason: "unpaid" }
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

/** @deprecated Prefer academyAccessDeniedMessage — kept for existing API imports. */
export function academyAccessDeniedMessageEs(
    reason: AcademyAccessEvaluation["reason"] | undefined
): string {
    return academyAccessDeniedMessage(reason, "es")
}

export function isAllowedAdminAccessType(value: string): value is AcademyAccessType {
    return (ACADEMY_ACCESS_TYPES as readonly string[]).includes(value)
}
