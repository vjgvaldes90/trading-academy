/**
 * Welcome-email rules shared by Stripe fulfillment, pre-enrollment, and admin provisioning.
 * Pure: no Resend, no database.
 */

export type WelcomeEmailClaimState = {
    welcomeEmailSentAt: string | null
}

/**
 * Welcome goes only to a student created by this registration.
 * An existing row (renewal, profile update, second checkout) never qualifies,
 * even when welcome_email_sent_at is still NULL (rows created before this column).
 */
export function shouldSendStudentWelcome(args: {
    studentExisted: boolean
    welcomeEmailSentAt: string | null | undefined
}): boolean {
    if (args.studentExisted) return false
    if (typeof args.welcomeEmailSentAt === "string" && args.welcomeEmailSentAt.trim().length > 0) {
        return false
    }
    return true
}

/** First caller to claim a NULL timestamp wins. A second caller must not send. */
export function claimStudentWelcomeSend(
    state: WelcomeEmailClaimState,
    sentAtIso: string
): "claimed" | "already_sent" {
    if (typeof state.welcomeEmailSentAt === "string" && state.welcomeEmailSentAt.trim().length > 0) {
        return "already_sent"
    }
    state.welcomeEmailSentAt = sentAtIso
    return "claimed"
}

export type WelcomeAttemptResult = {
    /** The student row is already saved. Email outcome never rolls that back. */
    saved: true
    emailed: boolean
    skipped: boolean
}

/**
 * Registration is already saved. A failed send does not unsave the student.
 * The claim stays after a failed send so a retry cannot deliver a second welcome.
 */
export function completeStudentWelcomeAttempt(args: {
    studentExisted: boolean
    state: WelcomeEmailClaimState
    sentAtIso: string
    send: () => { ok: boolean }
}): WelcomeAttemptResult {
    if (
        !shouldSendStudentWelcome({
            studentExisted: args.studentExisted,
            welcomeEmailSentAt: args.state.welcomeEmailSentAt,
        })
    ) {
        return { saved: true, emailed: false, skipped: true }
    }

    if (claimStudentWelcomeSend(args.state, args.sentAtIso) === "already_sent") {
        return { saved: true, emailed: false, skipped: true }
    }

    const sent = args.send()
    if (!sent.ok) {
        return { saved: true, emailed: false, skipped: false }
    }
    return { saved: true, emailed: true, skipped: false }
}
