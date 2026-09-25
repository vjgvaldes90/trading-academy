/**
 * Shared Theory quota period parsing / second-precision matching.
 * Semantics match Phase A claim RPCs (date_trunc('second', …)).
 */

export type TheoryBillingPeriod = {
    start: Date
    end: Date
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
