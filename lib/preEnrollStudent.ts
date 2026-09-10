/**
 * Phase 1 pre-enrollment: create trading_students as access_type = pre_enrolled.
 * Server enforces America/New_York launch window via {@link isPreEnrollmentOpen}.
 */

import { createSupabaseServiceRoleClient } from "@/lib/access"
import { generateAccessCode } from "@/lib/accessCode"
import { isPreEnrollmentOpen } from "@/lib/academyLaunch"
import {
    notifyNewStudentCreated,
} from "@/lib/adminNotifications"
import { sendEmail } from "@/lib/sendEmail"
import { PRE_ENROLLED_ACCESS_TYPE } from "@/lib/studentAcademyAccess"
import {
    isValidSubscriptionPlan,
    type SubscriptionPlanId,
} from "@/lib/subscriptionPlans"
import { SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END } from "@/lib/subscriptionCancellation"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
    "active",
    SUBSCRIPTION_STATUS_CANCEL_AT_PERIOD_END,
])

export type PreEnrollInput = {
    email: unknown
    plan: unknown
}

export type PreEnrollSuccess = {
    ok: true
    created: boolean
    alreadyRegistered: boolean
    email: string
    plan: SubscriptionPlanId
    accessType: typeof PRE_ENROLLED_ACCESS_TYPE
    accessCode: string
    emailSent: boolean
    emailError?: string
}

export type PreEnrollFailure = {
    ok: false
    code:
        | "pre_enrollment_closed"
        | "invalid_email"
        | "invalid_plan"
        | "conflict_paid"
        | "already_exists"
        | "db_error"
    error: string
    status: 400 | 403 | 409 | 500
}

export type PreEnrollResult = PreEnrollSuccess | PreEnrollFailure

function normalizeEmail(raw: unknown): string | null {
    if (typeof raw !== "string") return null
    const email = raw.trim().toLowerCase()
    if (!email || !EMAIL_RE.test(email)) return null
    return email
}

function parsePlan(raw: unknown): SubscriptionPlanId | null {
    if (typeof raw !== "string") return null
    const normalized = raw.trim().toLowerCase()
    if (!isValidSubscriptionPlan(normalized)) return null
    return normalized
}

function hasBlockingPaidAccess(row: {
    access_type?: string | null
    subscription_id?: string | null
    subscription_status?: string | null
    is_active?: boolean | null
}): boolean {
    const accessType = (row.access_type ?? "").trim().toLowerCase()
    const subscriptionId =
        typeof row.subscription_id === "string" && row.subscription_id.trim()
            ? row.subscription_id.trim()
            : null
    const subscriptionStatus =
        typeof row.subscription_status === "string" && row.subscription_status.trim()
            ? row.subscription_status.trim()
            : null

    if (
        subscriptionId &&
        subscriptionStatus &&
        BLOCKING_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
    ) {
        return true
    }

    // Paid (or paid-like) accounts must never be overwritten by pre-enrollment.
    if (accessType === "paid" && row.is_active !== false) {
        return true
    }

    return false
}

/**
 * Register a student during the pre-enrollment window.
 * Does not accept client-supplied access_type — always sets pre_enrolled when open.
 */
export async function preEnrollStudent(input: PreEnrollInput): Promise<PreEnrollResult> {
    if (!isPreEnrollmentOpen()) {
        return {
            ok: false,
            code: "pre_enrollment_closed",
            error:
                "Pre-enrollment has ended. Please use the normal Checkout flow to activate your plan.",
            status: 403,
        }
    }

    const email = normalizeEmail(input.email)
    if (!email) {
        return {
            ok: false,
            code: "invalid_email",
            error: "A valid email is required.",
            status: 400,
        }
    }

    const plan = parsePlan(input.plan)
    if (!plan) {
        return {
            ok: false,
            code: "invalid_plan",
            error: 'Invalid plan. Allowed values: "full_program", "trading_only".',
            status: 400,
        }
    }

    const supabase = createSupabaseServiceRoleClient()

    const { data: existing, error: lookupError } = await supabase
        .from("trading_students")
        .select(
            "id, email, access_code, access_type, plan, is_active, subscription_id, subscription_status"
        )
        .eq("email", email)
        .maybeSingle()

    if (lookupError) {
        console.error("[preEnrollStudent] lookup failed", lookupError)
        return {
            ok: false,
            code: "db_error",
            error: "Failed to look up student.",
            status: 500,
        }
    }

    if (existing) {
        if (hasBlockingPaidAccess(existing)) {
            return {
                ok: false,
                code: "conflict_paid",
                error:
                    "An active paid account already exists for this email. Pre-enrollment cannot modify it.",
                status: 409,
            }
        }

        const existingType = (existing.access_type ?? "").trim().toLowerCase()
        if (existingType === PRE_ENROLLED_ACCESS_TYPE) {
            const existingCode =
                typeof existing.access_code === "string" && existing.access_code.trim()
                    ? existing.access_code.trim()
                    : ""
            const existingPlan = parsePlan(existing.plan) ?? plan

            if (!existingCode) {
                console.error("[preEnrollStudent] pre_enrolled row missing access_code", {
                    email,
                })
                return {
                    ok: false,
                    code: "db_error",
                    error: "Existing pre-enrolled account is missing an access code.",
                    status: 500,
                }
            }

            // Do not change plan or regenerate code. Resend welcome email with existing code.
            const sendResult = await sendEmail(email, existingCode)
            return {
                ok: true,
                created: false,
                alreadyRegistered: true,
                email,
                plan: existingPlan,
                accessType: PRE_ENROLLED_ACCESS_TYPE,
                accessCode: existingCode,
                emailSent: sendResult.ok,
                emailError: sendResult.ok ? undefined : sendResult.error,
            }
        }

        return {
            ok: false,
            code: "already_exists",
            error: "A student account already exists for this email.",
            status: 409,
        }
    }

    const accessCode = generateAccessCode()

    const { data: saved, error: insertError } = await supabase
        .from("trading_students")
        .insert({
            email,
            plan,
            access_code: accessCode,
            access_type: PRE_ENROLLED_ACCESS_TYPE,
            is_active: true,
            subscription_id: null,
            subscription_status: null,
            access_expires_at: null,
        })
        .select("id, email, access_code, plan, access_type")
        .single()

    if (insertError) {
        // Race on unique email — treat as conflict without overwrite.
        if (insertError.code === "23505") {
            return {
                ok: false,
                code: "already_exists",
                error: "A student account already exists for this email.",
                status: 409,
            }
        }
        console.error("[preEnrollStudent] insert failed", insertError)
        return {
            ok: false,
            code: "db_error",
            error: "Failed to create pre-enrolled student.",
            status: 500,
        }
    }

    await notifyNewStudentCreated(supabase, {
        email,
        studentId: typeof saved?.id === "string" ? saved.id : null,
    })

    const sendResult = await sendEmail(email, accessCode)
    if (!sendResult.ok) {
        console.error("[preEnrollStudent] welcome email failed", sendResult.error)
    }

    return {
        ok: true,
        created: true,
        alreadyRegistered: false,
        email,
        plan,
        accessType: PRE_ENROLLED_ACCESS_TYPE,
        accessCode,
        emailSent: sendResult.ok,
        emailError: sendResult.ok ? undefined : sendResult.error,
    }
}
