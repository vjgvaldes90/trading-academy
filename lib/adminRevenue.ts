/**
 * Admin revenue metrics from Stripe Balance Transactions (read-only).
 * Net of refunds; America/New_York calendar boundaries.
 */

import type Stripe from "stripe"
import { ET_TIME_ZONE, getEtYmd, zonedWallTimeToUtc } from "@/lib/etCalendar"
import { createStripeClient, getStripeSecretKey } from "@/lib/stripe-server"

export const ADMIN_REVENUE_TIME_ZONE = ET_TIME_ZONE
export { getEtYmd, zonedWallTimeToUtc }

/** Charge/payment inflow + refund outflow (signed amounts). Excludes fees/transfers. */
const REVENUE_BALANCE_TYPES = ["charge", "payment", "refund", "payment_refund"] as const

export type AdminRevenueMetrics = {
    /** Cents (USD). Net of refunds. */
    todayCents: number
    thisWeekCents: number
    thisMonthCents: number
    previousMonthCents: number
    allTimeCents: number
    /** null when previous month is 0 (avoid Infinity/NaN). */
    vsPreviousMonthPercent: number | null
    currency: "usd"
    timeZone: typeof ADMIN_REVENUE_TIME_ZONE
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

export type EtPeriodBounds = {
    todayStartUnix: number
    weekStartUnix: number
    monthStartUnix: number
    previousMonthStartUnix: number
    previousMonthEndUnix: number
    nowUnix: number
}

export function getEtPeriodBounds(now: Date = new Date()): EtPeriodBounds {
    const tz = ADMIN_REVENUE_TIME_ZONE
    const { year, month, day } = getEtYmd(now, tz)
    const todayStart = zonedWallTimeToUtc(year, month, day, 0, 0, 0, tz)
    const monthStart = zonedWallTimeToUtc(year, month, 1, 0, 0, 0, tz)
    const previousMonthStart =
        month === 1
            ? zonedWallTimeToUtc(year - 1, 12, 1, 0, 0, 0, tz)
            : zonedWallTimeToUtc(year, month - 1, 1, 0, 0, 0, tz)

    return {
        todayStartUnix: Math.floor(todayStart.getTime() / 1000),
        weekStartUnix: getEtWeekStartUnix(now, tz),
        monthStartUnix: Math.floor(monthStart.getTime() / 1000),
        previousMonthStartUnix: Math.floor(previousMonthStart.getTime() / 1000),
        previousMonthEndUnix: Math.floor(monthStart.getTime() / 1000),
        nowUnix: Math.floor(now.getTime() / 1000),
    }
}

export function computeMomPercent(currentMonthCents: number, previousMonthCents: number): number | null {
    if (previousMonthCents === 0) return null
    return ((currentMonthCents - previousMonthCents) / previousMonthCents) * 100
}

function isUsdRevenueTxn(txn: Stripe.BalanceTransaction): boolean {
    if (txn.currency !== "usd") return false
    return (REVENUE_BALANCE_TYPES as readonly string[]).includes(txn.type)
}

/**
 * One paginated walk per revenue type; buckets in memory (efficient for academy volume).
 */
export async function fetchAdminRevenueMetrics(
    stripe: Stripe,
    now: Date = new Date()
): Promise<AdminRevenueMetrics> {
    const bounds = getEtPeriodBounds(now)
    let todayCents = 0
    let thisWeekCents = 0
    let thisMonthCents = 0
    let previousMonthCents = 0
    let allTimeCents = 0

    for (const type of REVENUE_BALANCE_TYPES) {
        for await (const txn of stripe.balanceTransactions.list({
            type,
            limit: 100,
        })) {
            if (!isUsdRevenueTxn(txn)) continue
            const amount = txn.amount
            const created = txn.created
            allTimeCents += amount

            if (created >= bounds.todayStartUnix && created <= bounds.nowUnix) {
                todayCents += amount
            }
            if (created >= bounds.weekStartUnix && created <= bounds.nowUnix) {
                thisWeekCents += amount
            }
            if (created >= bounds.monthStartUnix && created <= bounds.nowUnix) {
                thisMonthCents += amount
            }
            if (created >= bounds.previousMonthStartUnix && created < bounds.previousMonthEndUnix) {
                previousMonthCents += amount
            }
        }
    }

    return {
        todayCents,
        thisWeekCents,
        thisMonthCents,
        previousMonthCents,
        allTimeCents,
        vsPreviousMonthPercent: computeMomPercent(thisMonthCents, previousMonthCents),
        currency: "usd",
        timeZone: ADMIN_REVENUE_TIME_ZONE,
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
