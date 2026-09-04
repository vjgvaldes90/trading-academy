/**
 * Single source of truth for subscription plan identifiers, theory entitlements,
 * and server-side Stripe Price selection (never accept Price IDs from the client).
 */

import {
    getStripePriceId,
    getStripePriceIdFullProgram,
} from "@/lib/stripe-server"

export const SUBSCRIPTION_PLANS = ["trading_only", "full_program"] as const

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]

export type SubscriptionPlanDefinition = {
    id: SubscriptionPlanId
    label: string
    includesTheoryWindow: boolean
}

export const SUBSCRIPTION_PLAN_DEFINITIONS: Record<
    SubscriptionPlanId,
    SubscriptionPlanDefinition
> = {
    trading_only: {
        id: "trading_only",
        label: "Solo Trading",
        includesTheoryWindow: false,
    },
    full_program: {
        id: "full_program",
        label: "Programa Completo",
        includesTheoryWindow: true,
    },
}

export type SubscriptionPlanFields = {
    plan?: string | null
    program_theory_until?: string | null
}

export type StripePriceForPlanResult =
    | { ok: true; plan: SubscriptionPlanId; priceId: string }
    | {
          ok: false
          plan: SubscriptionPlanId
          code: "missing_trading_price" | "missing_full_program_price"
          error: string
      }

export type TheoryAccessEvaluation = {
    ok: boolean
    reason?: "no_theory"
}

export function isValidSubscriptionPlan(value: unknown): value is SubscriptionPlanId {
    return typeof value === "string" && (SUBSCRIPTION_PLANS as readonly string[]).includes(value)
}

/** NULL / blank / unknown → trading_only (legacy). */
export function resolveSubscriptionPlan(
    raw: string | null | undefined
): SubscriptionPlanId {
    if (typeof raw === "string") {
        const normalized = raw.trim().toLowerCase()
        if (isValidSubscriptionPlan(normalized)) {
            return normalized
        }
    }
    return "trading_only"
}

export function parseCheckoutPlan(raw: unknown):
    | { ok: true; plan: SubscriptionPlanId }
    | { ok: false; error: string } {
    if (raw === undefined || raw === null) {
        return { ok: true, plan: "trading_only" }
    }
    if (typeof raw !== "string") {
        return {
            ok: false,
            error: 'Invalid plan. Allowed values: "trading_only", "full_program".',
        }
    }
    const trimmed = raw.trim()
    if (!trimmed) {
        return { ok: true, plan: "trading_only" }
    }
    const normalized = trimmed.toLowerCase()
    if (!isValidSubscriptionPlan(normalized)) {
        return {
            ok: false,
            error: 'Invalid plan. Allowed values: "trading_only", "full_program".',
        }
    }
    return { ok: true, plan: normalized }
}

/** Never falls back full_program → $150. */
export function getStripePriceIdForPlan(plan: SubscriptionPlanId): StripePriceForPlanResult {
    if (plan === "trading_only") {
        const priceId = getStripePriceId()
        if (!priceId) {
            return {
                ok: false,
                plan,
                code: "missing_trading_price",
                error: "STRIPE_PRICE_ID is not configured",
            }
        }
        return { ok: true, plan, priceId }
    }

    const priceId = getStripePriceIdFullProgram()
    if (!priceId) {
        return {
            ok: false,
            plan,
            code: "missing_full_program_price",
            error: "Plan full_program is not configured (STRIPE_PRICE_ID_FULL_PROGRAM missing)",
        }
    }
    return { ok: true, plan, priceId }
}

export function planIncludesTheory(plan: string | null | undefined): boolean {
    return SUBSCRIPTION_PLAN_DEFINITIONS[resolveSubscriptionPlan(plan)].includesTheoryWindow
}

export function canAccessTheory(
    fields: SubscriptionPlanFields | null | undefined,
    now: Date = new Date()
): boolean {
    if (!fields) return false
    if (!planIncludesTheory(fields.plan)) return false
    const untilRaw = fields.program_theory_until
    if (typeof untilRaw !== "string" || !untilRaw.trim()) return false
    const untilMs = Date.parse(untilRaw.trim())
    if (!Number.isFinite(untilMs)) return false
    return untilMs > now.getTime()
}

export function evaluateTheoryAccess(
    fields: SubscriptionPlanFields | null | undefined,
    now: Date = new Date()
): TheoryAccessEvaluation {
    if (!canAccessTheory(fields, now)) {
        return { ok: false, reason: "no_theory" }
    }
    return { ok: true }
}
