import type { SupabaseClient } from "@supabase/supabase-js"
import { sendNewStudentEnrollmentPush } from "@/lib/adminPushSend"

export const ADMIN_NOTIFICATION_TYPES = [
    "new_student",
    "new_ticket",
    "booking_created",
    "booking_cancelled",
    "subscription_cancelled",
] as const

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number]

export type AdminNotification = {
    id: string
    type: AdminNotificationType
    title: string
    description: string
    is_read: boolean
    created_at: string
    metadata: Record<string, unknown>
}

export type CreateAdminNotificationInput = {
    type: AdminNotificationType
    title: string
    description?: string
    metadata?: Record<string, unknown>
}

type CreateAdminNotificationResult =
    | { ok: true; id: string; created_at: string }
    | { ok: false }

/**
 * Insert an admin dashboard notification. Failures are logged and do not throw,
 * so student/payment flows are never blocked by notification issues.
 */
export async function createAdminNotification(
    supabase: SupabaseClient,
    input: CreateAdminNotificationInput
): Promise<CreateAdminNotificationResult> {
    try {
        const { data, error } = await supabase
            .from("admin_notifications")
            .insert({
                type: input.type,
                title: input.title.trim(),
                description: (input.description ?? "").trim(),
                is_read: false,
                metadata: input.metadata ?? {},
            })
            .select("id, created_at")
            .single()

        if (error) {
            console.error("[admin-notifications] insert failed", error)
            return { ok: false }
        }

        const id = typeof data?.id === "string" ? data.id : ""
        const created_at = typeof data?.created_at === "string" ? data.created_at : ""
        if (!id) {
            console.error("[admin-notifications] insert missing id")
            return { ok: false }
        }

        return { ok: true, id, created_at: created_at || new Date().toISOString() }
    } catch (e) {
        console.error("[admin-notifications] insert exception", e)
        return { ok: false }
    }
}

const NEW_STUDENT_PUSH_DEDUPE_LOOKBACK_MS = 24 * 60 * 60 * 1000

/**
 * Idempotent push claim for a new_student notification.
 *
 * Only the oldest new_student row for this email in the lookback window may send.
 * - The just-inserted row is never penalized for counting itself.
 * - Concurrent inserts: all see the same winner (min created_at, then min id); only one sends.
 * - Retries that insert a second notification: the original remains the winner; no second push.
 *
 * Call-site `!existed` remains the primary guard against notifying on existing students.
 */
async function claimNewStudentPushSend(args: {
    supabase: SupabaseClient
    email: string
    notificationId: string
}): Promise<"send" | "skip" | "send_on_error"> {
    try {
        const since = new Date(Date.now() - NEW_STUDENT_PUSH_DEDUPE_LOOKBACK_MS).toISOString()
        const { data, error } = await args.supabase
            .from("admin_notifications")
            .select("id, created_at")
            .eq("type", "new_student")
            .contains("metadata", { email: args.email })
            .gte("created_at", since)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .limit(1)

        if (error) {
            console.error("[admin-push] push claim query failed", error.message)
            // Prefer one send over silently dropping on a check failure.
            return "send_on_error"
        }

        const winner = Array.isArray(data) && data.length > 0 ? data[0] : null
        const winnerId = winner && typeof winner.id === "string" ? winner.id : null

        if (!winnerId) {
            // Our row should be visible; if not, still attempt send once.
            console.error("[admin-push] push claim found no winner row; attempting send")
            return "send_on_error"
        }

        if (winnerId !== args.notificationId) {
            console.log("[admin-push] skip duplicate new_student push", {
                reason: "not_window_winner",
            })
            return "skip"
        }

        return "send"
    } catch {
        console.error("[admin-push] push claim exception")
        return "send_on_error"
    }
}

export async function notifyNewStudentCreated(
    supabase: SupabaseClient,
    args: { email: string; studentId?: string | null; name?: string | null }
): Promise<void> {
    const email = args.email.trim().toLowerCase()
    const name = args.name?.trim() || null
    const inserted = await createAdminNotification(supabase, {
        type: "new_student",
        title: "New student registered",
        description: name ? `${name} (${email})` : email,
        metadata: {
            email,
            student_id: args.studentId ?? null,
            name,
        },
    })

    // Push only after a successful in-app notification insert. Best-effort: never throw.
    if (!inserted.ok) return

    try {
        const claim = await claimNewStudentPushSend({
            supabase,
            email,
            notificationId: inserted.id,
        })
        if (claim === "skip") return

        const result = await sendNewStudentEnrollmentPush(supabase)
        console.log("[admin-push] new_student push result", {
            claim,
            attempted: result.attempted,
            accepted: result.accepted,
            removed: result.removed,
        })
    } catch {
        console.error("[admin-push] new_student push failed (non-blocking)")
    }
}

/** Returns true if a trading_students row already exists for this email. */
export async function tradingStudentExistsByEmail(
    supabase: SupabaseClient,
    email: string
): Promise<boolean> {
    const normalized = email.trim().toLowerCase()
    const { data, error } = await supabase
        .from("trading_students")
        .select("id")
        .eq("email", normalized)
        .maybeSingle()
    if (error) {
        console.error("[admin-notifications] student exists check failed", error)
        return true
    }
    return Boolean(data)
}
