/**
 * Admin revenue metrics from Stripe Balance Transactions (read-only).
 * Net of refunds; America/New_York calendar boundaries.
 * Tracking start: academy official launch (2026-09-24 00:00 ET) — logical filter only.
 */

import type Stripe from "stripe"
import { getOfficialLaunchInstant } from "@/lib/academyLaunch"
import { ET_TIME_ZONE, getEtYmd, zonedWallTimeToUtc } from "@/lib/etCalendar"
import { createStripeClient, getStripeSecretKey } from "@/lib/stripe-server"

export const ADMIN_REVENUE_TIME_ZONE = ET_TIME_ZONE
export { getEtYmd, zonedWallTimeToUtc }

/** Charge/payment inflow + refund outflow (signed amounts). Excludes fees/transfers. */
const REVENUE_BALANCE_TYPES = ["charge", "payment", "refund", "payment_refund"] as const

export type AdminRevenuePeriod = {
    /** Cents (USD). Net of refunds in [startUnix, endUnix]. */
    cents: number
    /** Inclusive start (unix seconds), after clamping to tracking start. */
    startUnix: number
    /** Inclusive end used for the sum (typically "now"). */
    endUnix: number
}

export type AdminRevenueMetrics = {
    weekly: AdminRevenuePeriod
    monthly: AdminRevenuePeriod
    annual: AdminRevenuePeriod
    currency: "usd"
    timeZone: typeof ADMIN_REVENUE_TIME_ZONE
    /** Academy revenue tracking floor (unix seconds). */
    trackingStartUnix: number
}

/** Monday 00:00:00 ET of the week containing `now`. */
export function getEtWeekStartUnix(now: Date, timeZone: string = ADMIN_REVENUE_TIME_ZONE): number {
    const { year, month, day } = getEtYmd(now, timeZone)
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now)
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const dow = map[weekday] ?? 1
    const diffToMonday = dow === 0 ? -6 : 1 - dow
    // day+diffToMonday may cross months — Date.UTC overflow in zonedWallTimeToUtc handles it.
    const startCandidate = zonedWallTimeToUtc(year, month, day + diffToMonday, 0, 0, 0, timeZone)
    return Math.floor(startCandidate.getTime() / 1000)
}

export type AdminRevenuePeriodBounds = {
    trackingStartUnix: number
    weekStartUnix: number
    monthStartUnix: number
    yearStartUnix: number
    nowUnix: number
}

/**
 * Calendar period starts in ET, each clamped to the revenue tracking floor
 * (2026-09-24 00:00 America/New_York).
 */
export function getAdminRevenuePeriodBounds(now: Date = new Date()): AdminRevenuePeriodBounds {
    const tz = ADMIN_REVENUE_TIME_ZONE
    const { year, month } = getEtYmd(now, tz)
    const trackingStartUnix = Math.floor(getOfficialLaunchInstant(tz).getTime() / 1000)
    const nowUnix = Math.floor(now.getTime() / 1000)

    const weekCalendarStart = getEtWeekStartUnix(now, tz)
    const monthCalendarStart = Math.floor(zonedWallTimeToUtc(year, month, 1, 0, 0, 0, tz).getTime() / 1000)
    const yearCalendarStart = Math.floor(zonedWallTimeToUtc(year, 1, 1, 0, 0, 0, tz).getTime() / 1000)

    return {
        trackingStartUnix,
        weekStartUnix: Math.max(weekCalendarStart, trackingStartUnix),
        monthStartUnix: Math.max(monthCalendarStart, trackingStartUnix),
        yearStartUnix: Math.max(yearCalendarStart, trackingStartUnix),
        nowUnix,
    }
}

function isUsdRevenueTxn(txn: Stripe.BalanceTransaction): boolean {
    if (txn.currency !== "usd") return false
    return (REVENUE_BALANCE_TYPES as readonly string[]).includes(txn.type)
}

function inInclusiveRange(created: number, startUnix: number, endUnix: number): boolean {
    return created >= startUnix && created <= endUnix
}

/**
 * One paginated walk per revenue type from the tracking floor; buckets in memory.
 * Uses Balance Transaction `created` (successful money movement), not student/session dates.
 * Each txn id appears once per type list — no double-count across charge vs payment for the same type walk.
 */
export async function fetchAdminRevenueMetrics(
    stripe: Stripe,
    now: Date = new Date()
): Promise<AdminRevenueMetrics> {
    const bounds = getAdminRevenuePeriodBounds(now)
    let weeklyCents = 0
    let monthlyCents = 0
    let annualCents = 0

    for (const type of REVENUE_BALANCE_TYPES) {
        for await (const txn of stripe.balanceTransactions.list({
            type,
            limit: 100,
            created: { gte: bounds.trackingStartUnix },
        })) {
            if (!isUsdRevenueTxn(txn)) continue
            const amount = txn.amount
            const created = txn.created

            // Floor already applied via list filter; keep explicit guard.
            if (created < bounds.trackingStartUnix || created > bounds.nowUnix) continue

            if (inInclusiveRange(created, bounds.weekStartUnix, bounds.nowUnix)) {
                weeklyCents += amount
            }
            if (inInclusiveRange(created, bounds.monthStartUnix, bounds.nowUnix)) {
                monthlyCents += amount
            }
            if (inInclusiveRange(created, bounds.yearStartUnix, bounds.nowUnix)) {
                annualCents += amount
            }
        }
    }

    return {
        weekly: {
            cents: weeklyCents,
            startUnix: bounds.weekStartUnix,
            endUnix: bounds.nowUnix,
        },
        monthly: {
            cents: monthlyCents,
            startUnix: bounds.monthStartUnix,
            endUnix: bounds.nowUnix,
        },
        annual: {
            cents: annualCents,
            startUnix: bounds.yearStartUnix,
            endUnix: bounds.nowUnix,
        },
        currency: "usd",
        timeZone: ADMIN_REVENUE_TIME_ZONE,
        trackingStartUnix: bounds.trackingStartUnix,
    }
}

/** Safe server entry: null if Stripe not configured or API fails (caller logs). */
export async function tryFetchAdminRevenueMetrics(now: Date = new Date()): Promise<AdminRevenueMetrics | null> {
    if (!getStripeSecretKey()) return null
    const stripe = createStripeClient()
    return fetchAdminRevenueMetrics(stripe, now)
}

export function formatUsdFromCents(cents: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(cents / 100)
}

/** Format an inclusive ET date range for revenue card subtitles. */
export function formatAdminRevenueRangeLabel(
    startUnix: number,
    endUnix: number,
    locale: string,
    timeZone: string = ADMIN_REVENUE_TIME_ZONE
): string {
    const start = new Date(startUnix * 1000)
    const end = new Date(endUnix * 1000)
    const opts: Intl.DateTimeFormatOptions = {
        timeZone,
        month: "short",
        day: "numeric",
        year: "numeric",
    }
    const startLabel = new Intl.DateTimeFormat(locale, opts).format(start)
    const endLabel = new Intl.DateTimeFormat(locale, opts).format(end)
    if (startLabel === endLabel) return `${startLabel} (ET)`
    return `${startLabel} – ${endLabel} (ET)`
}
