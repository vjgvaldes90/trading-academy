/**
 * Academy-wide access (trading_students), independent of per-session bookings.
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

export function academyAccessDeniedMessageEs(
    reason: AcademyAccessEvaluation["reason"] | undefined
): string {
    switch (reason) {
        case "inactive":
            return "Tu cuenta está desactivada. Contacta al administrador."
        case "expired":
            return "Tu acceso ha caducado. Renueva o contacta al administrador."
        case "unpaid":
            return "No tienes acceso activo. Completa el pago o usa un código válido."
        case "not_found":
        default:
            return "No encontramos tu registro de acceso."
    }
}

export function isAllowedAdminAccessType(value: string): value is AcademyAccessType {
    return (ACADEMY_ACCESS_TYPES as readonly string[]).includes(value)
}
