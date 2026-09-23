import type { SupabaseClient } from "@supabase/supabase-js"
import webpush from "web-push"
import { getAdminPushVapidConfig } from "@/lib/adminPush"
import { normalizeUserEmail } from "@/lib/adminEmails"

export type AdminPushPayload = {
    title: string
    body: string
    url: string
}

export type AdminPushSendResult = {
    attempted: number
    accepted: number
    removed: number
}

type SubscriptionRow = {
    id: string
    endpoint: string
    p256dh: string
    auth: string
}

/** Minimal payload for new student enrollments — no PII beyond the generic message. */
export const NEW_STUDENT_ENROLLMENT_PUSH: AdminPushPayload = {
    title: "Smart Option Academy",
    body: "New student enrollment received.",
    url: "/admin-app/enrollments",
}

export const ADMIN_TEST_PUSH: AdminPushPayload = {
    title: "Smart Option Academy",
    body: "Test notification from Admin App.",
    url: "/admin-app/settings",
}

function configureWebPush(): boolean {
    const config = getAdminPushVapidConfig()
    if (!config) return false
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
    return true
}

function getErrorStatusCode(err: unknown): number | null {
    if (!err || typeof err !== "object") return null
    const statusCode = (err as { statusCode?: unknown }).statusCode
    return typeof statusCode === "number" ? statusCode : null
}

function isGoneSubscription(err: unknown): boolean {
    const status = getErrorStatusCode(err)
    return status === 404 || status === 410
}

async function removeStaleSubscription(supabase: SupabaseClient, id: string): Promise<boolean> {
    const { error } = await supabase.from("admin_push_subscriptions").delete().eq("id", id)
    if (error) {
        console.error("[admin-push] stale subscription cleanup failed", error.message)
        return false
    }
    return true
}

/**
 * Best-effort Web Push to stored admin subscriptions.
 * Never throws. Does not log endpoints, keys, or payload contents.
 */
export async function sendAdminWebPush(
    supabase: SupabaseClient,
    payload: AdminPushPayload,
    options?: { adminEmail?: string }
): Promise<AdminPushSendResult> {
    const result: AdminPushSendResult = { attempted: 0, accepted: 0, removed: 0 }

    try {
        if (!configureWebPush()) {
            console.error("[admin-push] VAPID not configured; skip send")
            return result
        }

        let query = supabase
            .from("admin_push_subscriptions")
            .select("id, endpoint, p256dh, auth")

        if (options?.adminEmail) {
            query = query.eq("admin_email", normalizeUserEmail(options.adminEmail))
        }

        const { data, error } = await query
        if (error) {
            console.error("[admin-push] load subscriptions failed", error.message)
            return result
        }

        const rows = (Array.isArray(data) ? data : []) as SubscriptionRow[]
        const body = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url,
        })

        for (const row of rows) {
            result.attempted += 1
            try {
                await webpush.sendNotification(
                    {
                        endpoint: row.endpoint,
                        keys: {
                            p256dh: row.p256dh,
                            auth: row.auth,
                        },
                    },
                    body,
                    {
                        TTL: 60 * 60 * 12,
                        urgency: "high",
                    }
                )
                result.accepted += 1
            } catch (err) {
                const statusCode = getErrorStatusCode(err)
                if (isGoneSubscription(err)) {
                    const removed = await removeStaleSubscription(supabase, row.id)
                    if (removed) result.removed += 1
                    console.error("[admin-push] removed stale subscription", { statusCode })
                } else {
                    console.error("[admin-push] send failed", {
                        statusCode: statusCode ?? "unknown",
                    })
                }
            }
        }
    } catch {
        console.error("[admin-push] send exception")
    }

    return result
}

/** Fan-out new-enrollment push to all subscribed admin devices. */
export async function sendNewStudentEnrollmentPush(supabase: SupabaseClient): Promise<void> {
    await sendAdminWebPush(supabase, NEW_STUDENT_ENROLLMENT_PUSH)
}

/** Test push limited to one admin's devices. */
export async function sendAdminTestPush(
    supabase: SupabaseClient,
    adminEmail: string
): Promise<AdminPushSendResult> {
    return sendAdminWebPush(supabase, ADMIN_TEST_PUSH, { adminEmail })
}
