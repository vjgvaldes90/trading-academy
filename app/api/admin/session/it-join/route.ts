import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { isAuthorizedItAdminEmail } from "@/lib/adminEmails"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Body = { session_id?: unknown }

/**
 * IT-only participant join for live sessions.
 * Returns `sessions.link` (student Zoom join_url) — never zoom_start_url.
 * Does not touch student access, theory quota, bookings, or Stripe.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        if (!isAuthorizedItAdminEmail(auth.email)) {
            return NextResponse.json(
                { error: "Forbidden — IT access only", code: "it_only" },
                { status: 403 }
            )
        }

        const body = (await req.json().catch(() => null)) as Body | null
        const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : ""

        if (!sessionId || !UUID_RE.test(sessionId)) {
            return NextResponse.json({ error: "Invalid session_id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: row, error } = await supabase
            .from("sessions")
            .select("id, status, link")
            .eq("id", sessionId)
            .maybeSingle()

        if (error) {
            console.error("[api/admin/session/it-join] session lookup", error)
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

        const joinUrl =
            typeof rec.link === "string" && rec.link.trim() ? rec.link.trim() : ""
        if (!joinUrl) {
            return NextResponse.json(
                { error: "No participant meeting link configured", code: "missing_meeting_link" },
                { status: 503 }
            )
        }

        console.log("[ADMIN SESSION IT JOIN SUCCESS]", {
            session_id: sessionId,
            admin: auth.email,
            url_source: "sessions.link",
        })

        return NextResponse.json({ ok: true, join_url: joinUrl })
    } catch (e) {
        console.error("[api/admin/session/it-join] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
