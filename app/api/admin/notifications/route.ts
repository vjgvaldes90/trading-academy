import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    ADMIN_NOTIFICATION_TYPES,
    type AdminNotification,
    type AdminNotificationType,
} from "@/lib/adminNotifications"

export const runtime = "nodejs"

const LIST_LIMIT = 40

function isAdminNotificationType(value: unknown): value is AdminNotificationType {
    return typeof value === "string" && (ADMIN_NOTIFICATION_TYPES as readonly string[]).includes(value)
}

function mapRow(row: Record<string, unknown>): AdminNotification | null {
    const id = typeof row.id === "string" ? row.id : null
    if (!id || !isAdminNotificationType(row.type)) return null
    const title = typeof row.title === "string" ? row.title : ""
    const description = typeof row.description === "string" ? row.description : ""
    const created_at = typeof row.created_at === "string" ? row.created_at : ""
    const is_read = row.is_read === true
    const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {}
    return {
        id,
        type: row.type,
        title,
        description,
        is_read,
        created_at,
        metadata,
    }
}

export async function GET() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const supabase = createSupabaseServiceRoleClient()

        const [listRes, unreadRes] = await Promise.all([
            supabase
                .from("admin_notifications")
                .select("id, type, title, description, is_read, created_at, metadata")
                .order("created_at", { ascending: false })
                .limit(LIST_LIMIT),
            supabase
                .from("admin_notifications")
                .select("id", { count: "exact", head: true })
                .eq("is_read", false),
        ])

        if (listRes.error) {
            console.error("[api/admin/notifications] GET list", listRes.error)
            return NextResponse.json(
                { error: "Failed to load notifications", details: listRes.error.message },
                { status: 500 }
            )
        }
        if (unreadRes.error) {
            console.error("[api/admin/notifications] GET unread", unreadRes.error)
            return NextResponse.json(
                { error: "Failed to load unread count", details: unreadRes.error.message },
                { status: 500 }
            )
        }

        const notifications = (Array.isArray(listRes.data) ? listRes.data : [])
            .map((row) => mapRow(row as Record<string, unknown>))
            .filter((n): n is AdminNotification => n !== null)

        return NextResponse.json({
            notifications,
            unreadCount: typeof unreadRes.count === "number" ? unreadRes.count : 0,
        })
    } catch (e) {
        console.error("[api/admin/notifications] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const b = body as Record<string, unknown>
        const id = typeof b.id === "string" ? b.id.trim() : ""
        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("admin_notifications")
            .update({ is_read: true })
            .eq("id", id)
            .select("id, type, title, description, is_read, created_at, metadata")
            .single()

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Notification not found" }, { status: 404 })
            }
            console.error("[api/admin/notifications] PATCH", error)
            return NextResponse.json(
                { error: "Failed to mark as read", details: error.message },
                { status: 500 }
            )
        }

        const mapped = mapRow(data as Record<string, unknown>)
        if (!mapped) {
            return NextResponse.json({ error: "Invalid notification row" }, { status: 500 })
        }

        return NextResponse.json(mapped)
    } catch (e) {
        console.error("[api/admin/notifications] PATCH", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
