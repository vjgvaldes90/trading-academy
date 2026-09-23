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

/**
 * Insert an admin dashboard notification. Failures are logged and do not throw,
 * so student/payment flows are never blocked by notification issues.
 * Returns true only when the insert succeeded.
 */
export async function createAdminNotification(
    supabase: SupabaseClient,
    input: CreateAdminNotificationInput
): Promise<boolean> {
    try {
        const { error } = await supabase.from("admin_notifications").insert({
            type: input.type,
            title: input.title.trim(),
            description: (input.description ?? "").trim(),
            is_read: false,
            metadata: input.metadata ?? {},
        })
        if (error) {
            console.error("[admin-notifications] insert failed", error)
            return false
        }
        return true
    } catch (e) {
        console.error("[admin-notifications] insert exception", e)
        return false
    }
}

const NEW_STUDENT_PUSH_DEDUPE_LOOKBACK_MS = 24 * 60 * 60 * 1000

/**
 * Skip push when another new_student in-app notification for the same email
 * already exists in the lookback window (count > 1 after this insert).
 * Call-site `!existed` checks remain the primary idempotency guard.
 */
async function shouldSendNewStudentPush(
    supabase: SupabaseClient,
    email: string
): Promise<boolean> {
    try {
        const since = new Date(Date.now() - NEW_STUDENT_PUSH_DEDUPE_LOOKBACK_MS).toISOString()
        const { count, error } = await supabase
            .from("admin_notifications")
            .select("id", { count: "exact", head: true })
            .eq("type", "new_student")
            .contains("metadata", { email })
            .gte("created_at", since)

        if (error) {
            console.error("[admin-notifications] push dedupe check failed", error.message)
            // Prefer sending once over silently dropping on a check failure.
            return true
        }

        if (typeof count === "number" && count > 1) {
            console.log("[admin-push] skip duplicate new_student push")
            return false
        }

        return true
    } catch {
        console.error("[admin-notifications] push dedupe check exception")
        return true
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
    if (!inserted) return

    try {
        const sendPush = await shouldSendNewStudentPush(supabase, email)
        if (!sendPush) return
        await sendNewStudentEnrollmentPush(supabase)
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
