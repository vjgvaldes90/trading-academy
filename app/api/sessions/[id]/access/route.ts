import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteCtx = { params: Promise<{ id: string }> }

function normalizeEmail(raw: string | null): string | null {
    const s = raw?.trim().toLowerCase() ?? ""
    return s.length > 0 ? s : null
}

export async function GET(req: Request, context: RouteCtx) {
    try {
        const { id: sessionId } = await context.params
        if (!sessionId || !UUID_RE.test(sessionId)) {
            return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
        }

        const url = new URL(req.url)
        const userEmail = normalizeEmail(url.searchParams.get("userEmail") ?? url.searchParams.get("email"))
        if (!userEmail) {
            return NextResponse.json({ error: "userEmail query required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: booking, error: bookErr } = await supabase
            .from("bookings")
            .select("id")
            .eq("session_id", sessionId)
            .eq("user_email", userEmail)
            .eq("status", "confirmed")
            .maybeSingle()

        if (bookErr) {
            console.error("[api/sessions/[id]/access] booking lookup", bookErr)
            return NextResponse.json({ error: "Failed to verify access" }, { status: 500 })
        }
        if (!booking) {
            return NextResponse.json({ error: "No booking for this session" }, { status: 403 })
        }

        const { data: row, error: sessErr } = await supabase
            .from("sessions")
            .select("link")
            .eq("id", sessionId)
            .maybeSingle()

        if (sessErr) {
            console.error("[api/sessions/[id]/access] session lookup", sessErr)
            return NextResponse.json({ error: "Failed to load session" }, { status: 500 })
        }

        const meeting_url = typeof row?.link === "string" && row.link.trim() ? row.link.trim() : null
        return NextResponse.json({ meeting_url })
    } catch (e) {
        console.error("[api/sessions/[id]/access] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
