import type { SupabaseClient } from "@supabase/supabase-js"
import { recordStudentRegistered } from "@/lib/activityFeed"

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
 */
export async function createAdminNotification(
    supabase: SupabaseClient,
    input: CreateAdminNotificationInput
): Promise<void> {
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
        }
    } catch (e) {
        console.error("[admin-notifications] insert exception", e)
    }
}

export async function notifyNewStudentCreated(
    supabase: SupabaseClient,
    args: { email: string; studentId?: string | null; name?: string | null }
): Promise<void> {
    const email = args.email.trim().toLowerCase()
    const name = args.name?.trim() || null
    await createAdminNotification(supabase, {
        type: "new_student",
        title: "New student registered",
        description: name ? `${name} (${email})` : email,
        metadata: {
            email,
            student_id: args.studentId ?? null,
            name,
        },
    })
    await recordStudentRegistered(supabase, args)
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
