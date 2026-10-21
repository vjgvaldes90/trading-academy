import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    notifyNewStudentCreated,
    tradingStudentExistsByEmail,
} from "@/lib/adminNotifications"
import { sendEmail } from "@/lib/sendEmail"
import { deliverStudentWelcomeEmail } from "@/lib/studentWelcomeDelivery"
import { isDashboardProfileComplete } from "@/lib/tradingStudents"
import type { SubscriptionPlanId } from "@/lib/subscriptionPlans"

export type ProvisionStudentInput = {
    firstName: string
    lastName: string
    email: string
    phone?: string
    accessType: "free" | "paid" | "vip" | "discount"
    /**
     * Only applied when accessType === "free".
     * Defaults to trading_only when omitted.
     */
    plan?: SubscriptionPlanId
}

export type ProvisionStudentResult = {
    success: boolean
    message: string
}

function generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * Shared academy student provisioning (DB upsert + welcome email).
 * Same welcome email path Stripe uses via {@link sendEmail} → createWelcomeEmail.
 */
export async function provisionAcademyStudent(
    input: ProvisionStudentInput
): Promise<ProvisionStudentResult> {
    if (!input) {
        throw new Error("Missing input")
    }

    const firstName = input.firstName.trim()
    const lastName = input.lastName.trim()
    const email = input.email.trim().toLowerCase()
    const phone = typeof input.phone === "string" ? input.phone.trim() : ""
    const accessType = input.accessType
    const name = `${firstName} ${lastName}`.trim()
    const accessCode = generateAccessCode()

    const supabase = createSupabaseServiceRoleClient()
    const existed = await tradingStudentExistsByEmail(supabase, email)

    const row: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        name,
        email,
        phone: phone || null,
        access_code: accessCode,
        access_type: accessType,
        is_active: true,
        subscription_status: "active",
    }

    if (accessType === "free") {
        row.access_expires_at = null
        const plan: SubscriptionPlanId =
            input.plan === "full_program" ? "full_program" : "trading_only"
        row.plan = plan
    }

    const { data: savedRow, error: dbErr } = await supabase
        .from("trading_students")
        .upsert(row, { onConflict: "email" })
        .select("id, email, access_code, access_expires_at, access_type, plan")
        .single()

    if (dbErr) {
        console.error("[provisionAcademyStudent] trading_students upsert:", dbErr)
        throw new Error("Failed to save student")
    }
    if (!savedRow?.access_code || savedRow.access_code !== accessCode) {
        console.error("[provisionAcademyStudent] upsert row mismatch", { savedRow, accessCode })
        throw new Error("Failed to save access code")
    }

    if (!existed) {
        await notifyNewStudentCreated(supabase, {
            email,
            studentId: typeof savedRow.id === "string" ? savedRow.id : null,
            name,
        })
    }

    const welcomeContext = {
        plan:
            accessType === "free"
                ? input.plan === "full_program"
                    ? ("full_program" as const)
                    : ("trading_only" as const)
                : null,
        needsProfileCompletion: !isDashboardProfileComplete({
            email,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            profile_completed: false,
        }),
    }

    // Re-provision replaces the access code. That is a new credential, so the student
    // still gets one email. It does not go through the one-time welcome claim.
    if (existed) {
        const resent = await sendEmail(email, accessCode, name || undefined, undefined, welcomeContext)
        if (!resent.ok) {
            console.error("[provisionAcademyStudent] access code email failed (student kept)", resent.error)
            return {
                success: true,
                message: "Student updated. The new access code email could not be sent.",
            }
        }
        return {
            success: true,
            message: "Student updated and the new access code was emailed.",
        }
    }

    const welcome = await deliverStudentWelcomeEmail({
        supabase,
        email,
        accessCode,
        name,
        studentExisted: false,
        context: welcomeContext,
    })

    if (!welcome.emailed) {
        console.error("[provisionAcademyStudent] welcome email failed (student kept)", welcome.error)
        return {
            success: true,
            message: "Student provisioned. Welcome email could not be sent.",
        }
    }

    return {
        success: true,
        message: "Student provisioned and welcome email sent",
    }
}
