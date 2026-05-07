import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteCtx) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id } = await context.params
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data, error } = await supabase
            .from("bookings")
            .select("id, user_email, status, created_at")
            .eq("session_id", id)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[api/admin/session/[id]/bookings] GET", error)
            return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 })
        }

        const rows = Array.isArray(data) ? data : []
        if (rows.length === 0) {
            return NextResponse.json({ error: "No bookings found" }, { status: 404 })
        }

        return NextResponse.json(rows)
    } catch (err) {
        console.error("[api/admin/session/[id]/bookings] GET", err)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

