/**
 * Post-launch gate for access_type = pre_enrolled (America/New_York via academyLaunch).
 * Pure decision logic — no Stripe / DB side effects.
 */

import { isOfficialLaunchStarted } from "@/lib/academyLaunch"
import { PRE_ENROLLED_ACCESS_TYPE, normalizeAccessType } from "@/lib/studentAcademyAccess"
import {
    getStripePriceIdForPlan,
    isValidSubscriptionPlan,
    type SubscriptionPlanId,
} from "@/lib/subscriptionPlans"
import { SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END } from "@/lib/subscriptionCancellation"

const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
    "active",
    SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
])

export type PreEnrolledStudentGateRow = {
    access_type?: string | null
    plan?: string | null
    access_code?: string | null
    subscription_id?: string | null
    subscription_status?: string | null
    is_active?: boolean | null
}

export type PreEnrolledLoginDecision =
    | { action: "allow_access"; reason: "before_launch" | "active_subscription" | "not_pre_enrolled" }
    | { action: "require_checkout"; plan: SubscriptionPlanId }
    | { action: "reject_invalid_plan"; error: string }

export function hasBlockingSubscription(row: {
    subscription_id?: string | null
    subscription_status?: string | null
}): boolean {
    const subscriptionId =
        typeof row.subscription_id === "string" && row.subscription_id.trim()
            ? row.subscription_id.trim()
            : null
    const subscriptionStatus =
        typeof row.subscription_status === "string" && row.subscription_status.trim()
            ? row.subscription_status.trim()
            : null

    return (
        Boolean(subscriptionId) &&
        Boolean(subscriptionStatus) &&
        BLOCKING_SUBSCRIPTION_STATUSES.has(subscriptionStatus!)
    )
}

export function resolveStoredCheckoutPlan(
    plan: string | null | undefined
): { ok: true; plan: SubscriptionPlanId } | { ok: false; error: string } {
    if (typeof plan !== "string" || !plan.trim()) {
        return {
            ok: false,
            error: "Pre-enrolled student is missing a saved plan. Cannot start Checkout.",
        }
    }
    const normalized = plan.trim().toLowerCase()
    if (!isValidSubscriptionPlan(normalized)) {
        return {
            ok: false,
            error: 'Invalid saved plan. Expected "full_program" or "trading_only".',
        }
    }
    return { ok: true, plan: normalized }
}

/**
 * Decide login vs Checkout for a student row.
 * Pass `now` to simulate America/New_York launch boundaries in tests.
 */
export function evaluatePreEnrolledLogin(
    row: PreEnrolledStudentGateRow | null | undefined,
    now: Date = new Date()
): PreEnrolledLoginDecision {
    if (!row) {
        return { action: "allow_access", reason: "not_pre_enrolled" }
    }

    const type = normalizeAccessType(row.access_type)
    if (type !== PRE_ENROLLED_ACCESS_TYPE) {
        return { action: "allow_access", reason: "not_pre_enrolled" }
    }

    if (hasBlockingSubscription(row)) {
        return { action: "allow_access", reason: "active_subscription" }
    }

    if (!isOfficialLaunchStarted(now)) {
        return { action: "allow_access", reason: "before_launch" }
    }

    const planResolved = resolveStoredCheckoutPlan(row.plan)
    if (!planResolved.ok) {
        return { action: "reject_invalid_plan", error: planResolved.error }
    }

    return { action: "require_checkout", plan: planResolved.plan }
}

/** Price selection must match normal Checkout (no duplicate Prices). */
export function resolvePreEnrolledCheckoutPrice(plan: SubscriptionPlanId) {
    return getStripePriceIdForPlan(plan)
}

type SelfCheck = { name: string; pass: boolean; detail: string }

function assert(name: string, pass: boolean, detail: string): SelfCheck {
    return { name, pass, detail }
}

/** Instant just before official launch (2026-09-27 23:59:59 ET). */
export function sampleBeforeOfficialLaunch(): Date {
    // 2026-09-28 00:00 ET ≈ 2026-09-28 04:00 UTC (EDT). Use clearly-before UTC.
    return new Date(Date.UTC(2026, 8, 27, 15, 0, 0))
}

/** Official launch morning America/New_York. */
export function sampleOnOfficialLaunch(): Date {
    return new Date(Date.UTC(2026, 8, 28, 4, 0, 0))
}

/** After official launch. */
export function sampleAfterOfficialLaunch(): Date {
    return new Date(Date.UTC(2026, 9, 1, 16, 0, 0))
}

export function runPreEnrolledCheckoutSelfChecks(): {
    ok: boolean
    results: SelfCheck[]
} {
    const before = sampleBeforeOfficialLaunch()
    const onLaunch = sampleOnOfficialLaunch()
    const after = sampleAfterOfficialLaunch()

    const preFull = {
        access_type: "pre_enrolled",
        plan: "full_program",
        access_code: "K7MC6L",
        subscription_id: null,
        subscription_status: null,
        is_active: true,
    }

    const preTrading = {
        ...preFull,
        plan: "trading_only",
        access_code: "VJH9FT",
    }

    const paid = {
        access_type: "paid",
        plan: "full_program",
        access_code: "PAID01",
        subscription_id: "sub_x",
        subscription_status: "active",
        is_active: true,
    }

    const preWithSub = {
        ...preFull,
        subscription_id: "sub_active",
        subscription_status: "active",
    }

    const preBadPlan = {
        ...preFull,
        plan: null as string | null,
    }

    const d1 = evaluatePreEnrolledLogin(preFull, before)
    const d2 = evaluatePreEnrolledLogin(preFull, onLaunch)
    const d3 = evaluatePreEnrolledLogin(preFull, after)
    const d4 = evaluatePreEnrolledLogin(paid, after)
    const d5 = evaluatePreEnrolledLogin(preWithSub, after)
    const d6 = evaluatePreEnrolledLogin(preFull, after)
    const d7 = evaluatePreEnrolledLogin(preTrading, after)
    const d8 = evaluatePreEnrolledLogin(preBadPlan, after)

    const priceFull = resolvePreEnrolledCheckoutPrice("full_program")
    const priceTrading = resolvePreEnrolledCheckoutPrice("trading_only")

    const results: SelfCheck[] = [
        assert(
            "1. pre_enrolled before Sep 28 → allow",
            d1.action === "allow_access" && d1.reason === "before_launch",
            JSON.stringify(d1)
        ),
        assert(
            "2. pre_enrolled on Sep 28 → checkout",
            d2.action === "require_checkout" && d2.plan === "full_program",
            JSON.stringify(d2)
        ),
        assert(
            "3. pre_enrolled after Sep 28 → checkout",
            d3.action === "require_checkout" && d3.plan === "full_program",
            JSON.stringify(d3)
        ),
        assert(
            "4. paid after Sep 28 → allow (not pre_enrolled path)",
            d4.action === "allow_access" && d4.reason === "not_pre_enrolled",
            JSON.stringify(d4)
        ),
        assert(
            "5. pre_enrolled + active subscription → allow",
            d5.action === "allow_access" && d5.reason === "active_subscription",
            JSON.stringify(d5)
        ),
        assert(
            "6. full_program → Full Program price resolver",
            d6.action === "require_checkout" &&
                d6.plan === "full_program" &&
                priceFull.plan === "full_program" &&
                (priceFull.ok
                    ? !priceFull.priceId.includes("PLACEHOLDER")
                    : priceFull.code === "missing_full_program_price"),
            priceFull.ok
                ? `priceId=${priceFull.priceId}`
                : `code=${priceFull.code}`
        ),
        assert(
            "7. trading_only → Trading Only price resolver",
            d7.action === "require_checkout" &&
                d7.plan === "trading_only" &&
                priceTrading.plan === "trading_only" &&
                (priceTrading.ok || priceTrading.code === "missing_trading_price"),
            priceTrading.ok
                ? `priceId=${priceTrading.priceId}`
                : `code=${priceTrading.code}`
        ),
        assert(
            "8. null plan after launch → reject",
            d8.action === "reject_invalid_plan",
            JSON.stringify(d8)
        ),
        assert(
            "9. same access_code unchanged by gate",
            preFull.access_code === "K7MC6L" &&
                evaluatePreEnrolledLogin(preFull, after).action === "require_checkout",
            `access_code=${preFull.access_code}`
        ),
        assert(
            "price paths differ by plan when both configured",
            !priceFull.ok ||
                !priceTrading.ok ||
                priceFull.priceId !== priceTrading.priceId,
            `full=${priceFull.ok ? priceFull.priceId : "n/a"} trading=${priceTrading.ok ? priceTrading.priceId : "n/a"}`
        ),
    ]

    return { ok: results.every((r) => r.pass), results }
}
