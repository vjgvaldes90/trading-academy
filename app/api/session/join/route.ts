import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import { isWithinStudentSecureJoinWindow } from "@/lib/sessions"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type JoinBody = {
    session_id?: unknown
    user_email?: unknown
}

export async function POST(req: Request) {
    try {
        let denyReason = ""
        const verifiedEmail = await getVerifiedStudentEmailFromCookies()
        if (!verifiedEmail) {
            denyReason = "unauthorized"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason })
            return NextResponse.json({ error: "Unauthorized", code: denyReason }, { status: 401 })
        }

        let body: JoinBody
        try {
            body = (await req.json()) as JoinBody
        } catch {
            denyReason = "invalid_json"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason })
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : ""
        const bodyEmail =
            typeof body.user_email === "string" ? body.user_email.trim().toLowerCase() : ""

        if (!sessionId || !UUID_RE.test(sessionId)) {
            denyReason = "invalid_session_id"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason })
            return NextResponse.json({ error: "Invalid session_id" }, { status: 400 })
        }

        if (!bodyEmail || !EMAIL_RE.test(bodyEmail)) {
            denyReason = "invalid_user_email"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason })
            return NextResponse.json({ error: "Invalid user_email" }, { status: 400 })
        }

        if (bodyEmail !== verifiedEmail) {
            denyReason = "email_mismatch"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json(
                { error: "user_email does not match authenticated session", code: denyReason },
                { status: 403 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select("access_code, access_type, is_active, access_expires_at")
            .eq("email", verifiedEmail)
            .maybeSingle()

        if (accessErr) {
            console.error("[api/session/join] access lookup", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }

        const accessEv = evaluateAcademyAccess(accessRow as TradingStudentAccessRow | null)
        if (!accessEv.ok) {
            denyReason = accessEv.reason === "unpaid" ? "not_paid" : "access_denied"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json(
                { error: "Active paid access required", code: denyReason, reason: accessEv.reason },
                { status: 403 }
            )
        }

        const { data: booking, error: bookErr } = await supabase
            .from("bookings")
            .select("id")
            .eq("session_id", sessionId)
            .eq("user_email", verifiedEmail)
            .eq("status", "confirmed")
            .maybeSingle()

        if (bookErr) {
            console.error("[api/session/join] booking lookup", bookErr)
            return NextResponse.json({ error: "Failed to verify reservation" }, { status: 500 })
        }
        if (!booking?.id) {
            denyReason = "not_reserved"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json(
                { error: "No confirmed reservation for this session", code: denyReason },
                { status: 403 }
            )
        }

        const { data: row, error: sessErr } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", sessionId)
            .maybeSingle()

        if (sessErr) {
            console.error("[api/session/join] session lookup", sessErr)
            return NextResponse.json({ error: "Failed to load session" }, { status: 500 })
        }
        if (!row) {
            denyReason = "session_not_found"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json({ error: "Session not found", code: denyReason }, { status: 404 })
        }

        const rec = row as Record<string, unknown>
        const status = typeof rec.status === "string" ? rec.status.trim().toLowerCase() : ""
        if (status !== "active") {
            denyReason = "session_not_live"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json(
                { error: "Session is not available", code: denyReason },
                { status: 403 }
            )
        }

        const bookedSlotsRaw = rec.booked_slots ?? rec.seats_taken
        const bookedSlots =
            typeof bookedSlotsRaw === "number" && Number.isFinite(bookedSlotsRaw)
                ? bookedSlotsRaw
                : 0
        if (bookedSlots <= 0) {
            denyReason = "no_bookings_on_session"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json(
                { error: "Session has no active bookings", code: denyReason },
                { status: 403 }
            )
        }

        const session = mapSupabaseSessionRow(rec)
        if (!session) {
            denyReason = "session_parse"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json({ error: "Invalid session data" }, { status: 500 })
        }

        const now = new Date()
        if (!isWithinStudentSecureJoinWindow(session, now)) {
            denyReason = "outside_join_window"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json(
                {
                    error: "Join is only available from 10 minutes before start until 2 hours after start",
                    code: denyReason,
                },
                { status: 403 }
            )
        }

        const joinUrl =
            typeof rec.link === "string" && rec.link.trim() ? rec.link.trim() : ""
        if (!joinUrl) {
            denyReason = "missing_meeting_link"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json({ error: "Meeting link not configured", code: denyReason }, { status: 503 })
        }

        console.log("[SECURE JOIN SUCCESS]", { session_id: sessionId, user: verifiedEmail })
        return NextResponse.json({ join_url: joinUrl })
    } catch (e: unknown) {
        console.error("[api/session/join] POST", e)
        console.log("[SECURE JOIN DENIED]", { reason: "internal_error" })
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
