/**
 * Sends the enrollment welcome once, after the student row is saved.
 * A failed send does not throw: registration and payment already succeeded.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { sendEmail, type StudentWelcomeSendContext } from "@/lib/resend"
import {
    claimStudentWelcomeSend,
    shouldSendStudentWelcome,
    type WelcomeEmailClaimState,
} from "@/lib/studentWelcome"

export type StudentWelcomeDeliveryResult = {
    emailed: boolean
    skipped: boolean
    error?: string
}

async function claimWelcomeRow(
    supabase: SupabaseClient,
    email: string,
    sentAtIso: string
): Promise<"claimed" | "already_sent" | "claim_failed"> {
    const { data, error } = await supabase
        .from("trading_students")
        .update({ welcome_email_sent_at: sentAtIso })
        .eq("email", email)
        .is("welcome_email_sent_at", null)
        .select("id")

    if (error) {
        console.error("[student-welcome] claim failed", { email, error: error.message })
        return "claim_failed"
    }

    const rows = Array.isArray(data) ? data : []
    return rows.length > 0 ? "claimed" : "already_sent"
}

/**
 * Call only after the student insert/upsert has succeeded.
 * Existing students are skipped. A second caller loses the NULL claim and does not send.
 */
export async function deliverStudentWelcomeEmail(args: {
    supabase: SupabaseClient
    /** Stored student email (claim key). */
    email: string
    /** Inbox to send to. Defaults to `email`. */
    to?: string
    accessCode: string
    name?: string | null
    studentExisted: boolean
    welcomeEmailSentAt?: string | null
    context?: StudentWelcomeSendContext
}): Promise<StudentWelcomeDeliveryResult> {
    const state: WelcomeEmailClaimState = {
        welcomeEmailSentAt: args.welcomeEmailSentAt ?? null,
    }

    if (
        !shouldSendStudentWelcome({
            studentExisted: args.studentExisted,
            welcomeEmailSentAt: state.welcomeEmailSentAt,
        })
    ) {
        return { emailed: false, skipped: true }
    }

    const sentAtIso = new Date().toISOString()
    if (claimStudentWelcomeSend(state, sentAtIso) !== "claimed") {
        return { emailed: false, skipped: true }
    }

    const claim = await claimWelcomeRow(args.supabase, args.email, sentAtIso)
    if (claim !== "claimed") {
        return {
            emailed: false,
            skipped: claim === "already_sent",
            error: claim === "claim_failed" ? "welcome_claim_failed" : undefined,
        }
    }

    try {
        const sendResult = await sendEmail(
            args.to?.trim() || args.email,
            args.accessCode,
            args.name ?? undefined,
            undefined,
            args.context
        )
        if (!sendResult.ok) {
            console.error("[student-welcome] send failed after save (registration kept)", {
                email: args.email,
                error: sendResult.error,
            })
            return { emailed: false, skipped: false, error: sendResult.error }
        }
        return { emailed: true, skipped: false }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown welcome email error"
        console.error("[student-welcome] send threw after save (registration kept)", {
            email: args.email,
            error: message,
        })
        return { emailed: false, skipped: false, error: message }
    }
}
