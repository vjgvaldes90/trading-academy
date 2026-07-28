import type { SupabaseClient } from "@supabase/supabase-js"

export const ACTIVITY_FEED_TYPES = [
    "student_registered",
    "support_ticket_created",
    "booking_created",
    "booking_cancelled",
    "subscription_created",
    "subscription_cancelled",
    "live_session_created",
] as const

export type ActivityFeedType = (typeof ACTIVITY_FEED_TYPES)[number]

export type ActivityFeedItem = {
    id: string
    type: ActivityFeedType
    title: string
    description: string
    created_at: string
    metadata: Record<string, unknown>
}

export type CreateActivityFeedInput = {
    type: ActivityFeedType
    title: string
    description?: string
    metadata?: Record<string, unknown>
}

/**
 * Insert an executive dashboard activity event. Failures are logged and do not throw.
 */
export async function recordActivity(
    supabase: SupabaseClient,
    input: CreateActivityFeedInput
): Promise<void> {
    try {
        const { error } = await supabase.from("activity_feed").insert({
            type: input.type,
            title: input.title.trim(),
            description: (input.description ?? "").trim(),
            metadata: input.metadata ?? {},
        })
        if (error) {
            console.error("[activity-feed] insert failed", error)
        }
    } catch (e) {
        console.error("[activity-feed] insert exception", e)
    }
}

export async function recordStudentRegistered(
    supabase: SupabaseClient,
    args: { email: string; studentId?: string | null; name?: string | null }
): Promise<void> {
    const email = args.email.trim().toLowerCase()
    const name = args.name?.trim() || null
    await recordActivity(supabase, {
        type: "student_registered",
        title: "Student registered",
        description: name ? `${name} (${email})` : email,
        metadata: { email, student_id: args.studentId ?? null, name },
    })
}

export async function recordSupportTicketCreated(
    supabase: SupabaseClient,
    args: { ticketId: string; studentEmail: string; subject: string }
): Promise<void> {
    const email = args.studentEmail.trim().toLowerCase()
    await recordActivity(supabase, {
        type: "support_ticket_created",
        title: "Support ticket created",
        description: `${args.subject.trim()} — ${email}`,
        metadata: { ticket_id: args.ticketId, student_email: email, subject: args.subject },
    })
}

export async function recordBookingCreated(
    supabase: SupabaseClient,
    args: { sessionId?: string | null; email?: string | null; description?: string }
): Promise<void> {
    await recordActivity(supabase, {
        type: "booking_created",
        title: "Booking created",
        description: args.description?.trim() || "A seat was reserved",
        metadata: {
            session_id: args.sessionId ?? null,
            email: args.email?.trim().toLowerCase() ?? null,
        },
    })
}

export async function recordBookingCancelled(
    supabase: SupabaseClient,
    args: { sessionId?: string | null; email?: string | null; description?: string }
): Promise<void> {
    await recordActivity(supabase, {
        type: "booking_cancelled",
        title: "Booking cancelled",
        description: args.description?.trim() || "A seat reservation was cancelled",
        metadata: {
            session_id: args.sessionId ?? null,
            email: args.email?.trim().toLowerCase() ?? null,
        },
    })
}

export async function recordSubscriptionCreated(
    supabase: SupabaseClient,
    args: { email: string; subscriptionId?: string | null; studentId?: string | null }
): Promise<void> {
    const email = args.email.trim().toLowerCase()
    await recordActivity(supabase, {
        type: "subscription_created",
        title: "Subscription created",
        description: email,
        metadata: {
            email,
            subscription_id: args.subscriptionId ?? null,
            student_id: args.studentId ?? null,
        },
    })
}

export async function recordSubscriptionCancelled(
    supabase: SupabaseClient,
    args: { email?: string | null; subscriptionId?: string | null; studentId?: string | null }
): Promise<void> {
    const email = args.email?.trim().toLowerCase() || null
    await recordActivity(supabase, {
        type: "subscription_cancelled",
        title: "Subscription cancelled",
        description: email ?? args.subscriptionId ?? "Subscription ended",
        metadata: {
            email,
            subscription_id: args.subscriptionId ?? null,
            student_id: args.studentId ?? null,
        },
    })
}

export async function recordLiveSessionCreated(
    supabase: SupabaseClient,
    args: { sessionId?: string | null; date: string; time: string; title?: string | null }
): Promise<void> {
    const when = `${args.date} ${args.time}`.trim()
    await recordActivity(supabase, {
        type: "live_session_created",
        title: "Live session created",
        description: args.title?.trim() ? `${args.title.trim()} — ${when}` : when,
        metadata: {
            session_id: args.sessionId ?? null,
            date: args.date,
            time: args.time,
            title: args.title ?? null,
        },
    })
}
