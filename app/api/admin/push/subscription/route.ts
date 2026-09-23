import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    isAdminPushVapidConfigured,
    pushSubscriptionBodySchema,
    pushUnsubscribeBodySchema,
} from "@/lib/adminPush"
import { normalizeUserEmail } from "@/lib/adminEmails"

export const runtime = "nodejs"

function truncateUa(raw: string | null): string | null {
    if (!raw) return null
    const trimmed = raw.trim()
    if (!trimmed) return null
    return trimmed.slice(0, 512)
}

/**
 * Check whether this admin has a stored subscription for the given endpoint.
 * Query: ?endpoint=<url-encoded endpoint>
 * Does not return keys or full subscription secrets.
 */
export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        if (!isAdminPushVapidConfigured()) {
            return NextResponse.json(
                { configured: false, subscribed: false },
                { status: 200 }
            )
        }

        const endpoint = new URL(req.url).searchParams.get("endpoint")?.trim() ?? ""
        if (!endpoint) {
            return NextResponse.json(
                { error: "endpoint query parameter is required" },
                { status: 400 }
            )
        }

        const adminEmail = normalizeUserEmail(auth.email)
        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("admin_push_subscriptions")
            .select("id")
            .eq("admin_email", adminEmail)
            .eq("endpoint", endpoint)
            .maybeSingle()

        if (error) {
            console.error("[api/admin/push/subscription] GET", error.message)
            return NextResponse.json(
                { error: "Failed to check subscription status" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            configured: true,
            subscribed: Boolean(data?.id),
        })
    } catch (e) {
        console.error("[api/admin/push/subscription] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

/**
 * Register or update the current admin's push subscription (upsert by unique endpoint).
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        if (!isAdminPushVapidConfigured()) {
            return NextResponse.json(
                { error: "Push notifications are not configured on the server" },
                { status: 503 }
            )
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const parsed = pushSubscriptionBodySchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid subscription payload", details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const adminEmail = normalizeUserEmail(auth.email)
        const now = new Date().toISOString()
        const userAgent = truncateUa(req.headers.get("user-agent"))

        const supabase = createSupabaseServiceRoleClient()
        const { error } = await supabase.from("admin_push_subscriptions").upsert(
            {
                admin_email: adminEmail,
                endpoint: parsed.data.endpoint,
                p256dh: parsed.data.keys.p256dh,
                auth: parsed.data.keys.auth,
                user_agent: userAgent,
                updated_at: now,
            },
            { onConflict: "endpoint" }
        )

        if (error) {
            console.error("[api/admin/push/subscription] POST", error.message)
            return NextResponse.json(
                { error: "Failed to save subscription" },
                { status: 500 }
            )
        }

        return NextResponse.json({ ok: true, subscribed: true })
    } catch (e) {
        console.error("[api/admin/push/subscription] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

/**
 * Remove the current admin's subscription for the given endpoint.
 */
export async function DELETE(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const parsed = pushUnsubscribeBodySchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid unsubscribe payload", details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const adminEmail = normalizeUserEmail(auth.email)
        const supabase = createSupabaseServiceRoleClient()
        const { error } = await supabase
            .from("admin_push_subscriptions")
            .delete()
            .eq("admin_email", adminEmail)
            .eq("endpoint", parsed.data.endpoint)

        if (error) {
            console.error("[api/admin/push/subscription] DELETE", error.message)
            return NextResponse.json(
                { error: "Failed to remove subscription" },
                { status: 500 }
            )
        }

        return NextResponse.json({ ok: true, subscribed: false })
    } catch (e) {
        console.error("[api/admin/push/subscription] DELETE", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
