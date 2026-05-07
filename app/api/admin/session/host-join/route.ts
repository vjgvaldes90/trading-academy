import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import { isWithinAdminHostWindow } from "@/lib/sessions"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Body = { session_id?: unknown }

export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response
        const verifiedAdmin = auth.email

        const body = (await req.json().catch(() => null)) as Body | null
        const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : ""

        if (!sessionId || !UUID_RE.test(sessionId)) {
            return NextResponse.json({ error: "Invalid session_id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: row, error } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle()
        if (error) {
            console.error("[api/admin/session/host-join] session lookup", error)
            return NextResponse.json({ error: "Failed to load session" }, { status: 500 })
        }
        if (!row) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        const rec = row as Record<string, unknown>
        const status = typeof rec.status === "string" ? rec.status.trim().toLowerCase() : ""
        if (status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 403 })
        }

        const session = mapSupabaseSessionRow(rec)
        if (!session) return NextResponse.json({ error: "Invalid session data" }, { status: 500 })
        if (!isWithinAdminHostWindow(session, new Date())) {
            return NextResponse.json(
                { error: "Host access opens 15 minutes before session start", code: "too_early" },
                { status: 403 }
            )
        }

        const hostUrl =
            typeof rec.zoom_start_url === "string" && rec.zoom_start_url.trim()
                ? rec.zoom_start_url.trim()
                : typeof rec.link === "string" && rec.link.trim()
                  ? rec.link.trim()
                  : ""
        if (!hostUrl) {
            return NextResponse.json({ error: "No host meeting URL configured" }, { status: 503 })
        }

        const { error: hostMetaErr } = await supabase
            .from("sessions")
            .update({
                last_hosted_by_admin_email: verifiedAdmin,
                last_hosted_at: new Date().toISOString(),
            })
            .eq("id", sessionId)
        if (hostMetaErr) {
            console.error("[api/admin/session/host-join] host metadata update", hostMetaErr)
        }

        console.log("[ADMIN SESSION HOST JOIN SUCCESS]", { session_id: sessionId, admin: verifiedAdmin })
        return NextResponse.json({ join_url: hostUrl, zoom_start_url: hostUrl })
    } catch (e) {
        console.error("[api/admin/session/host-join] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
