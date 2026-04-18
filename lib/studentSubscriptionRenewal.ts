/**
 * Monthly-style subscription window on `trading_students.access_expires_at`.
 * Renewal: if an expiry exists, extend from max(existing expiry, now); otherwise from now.
 */

const DEFAULT_MONTHS = 1

/** Add calendar months (handles month-end edge cases via Date). */
export function addCalendarMonths(from: Date, months: number): Date {
    const d = new Date(from.getTime())
    d.setMonth(d.getMonth() + months)
    return d
}

/**
 * Next ISO expiry after renewal.
 * - No / invalid `currentExpiresAt`: from `ref` + `months`
 * - Valid `currentExpiresAt`: base = max(parsed expiry, ref), then base + `months`
 */
export function computeRenewalAccessExpiresAtIso(
    currentExpiresAt: string | null | undefined,
    ref: Date = new Date(),
    months: number = DEFAULT_MONTHS
): string {
    const refMs = ref.getTime()
    let base = new Date(refMs)

    if (typeof currentExpiresAt === "string" && currentExpiresAt.trim()) {
        const parsed = Date.parse(currentExpiresAt.trim())
        if (Number.isFinite(parsed)) {
            base = new Date(Math.max(parsed, refMs))
        }
    }

    return addCalendarMonths(base, months).toISOString()
}
