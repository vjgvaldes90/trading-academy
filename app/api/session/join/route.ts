import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    evaluateAcademyAccess,
    evaluateLiveSessionAccess,
    resolveLiveSessionType,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import { isWithinStudentSecureJoinWindow } from "@/lib/sessions"
import {
    assertOrClaimTheoryConsumption,
    theoryJoinUrlAllowed,
} from "@/lib/theoryClassQuota"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type JoinBody = {
    session_id?: unknown
    /**
     * Theory preview: validate entitlement/quota without claiming a new session.
     * Never returns join_url for an unclaimed Theory session.
     * Default true (claim + join_url when allowed).
     */
    consume?: unknown
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
        const consume = body.consume !== false

        if (!sessionId || !UUID_RE.test(sessionId)) {
            denyReason = "invalid_session_id"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason })
            return NextResponse.json({ error: "Invalid session_id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: accessRow, error: accessErr } = await supabase
            .from("trading_students")
            .select(
                "id, access_code, access_type, is_active, access_expires_at, plan, program_theory_until, theory_quota_period_start, theory_quota_period_end, subscription_id, subscription_status"
            )
            .eq("email", verifiedEmail)
            .maybeSingle()

        if (accessErr) {
            console.error("[api/session/join] access lookup", accessErr)
            return NextResponse.json({ error: "Access check failed" }, { status: 500 })
        }

        const student = accessRow as TradingStudentAccessRow | null
        const accessEv = evaluateAcademyAccess(student)
        if (!accessEv.ok) {
            denyReason = accessEv.reason === "unpaid" ? "not_paid" : "access_denied"
            console.log("[SECURE JOIN DENIED]", { reason: denyReason, session_id: sessionId })
            return NextResponse.json(
                { error: "Active paid access required", code: denyReason, reason: accessEv.reason },
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

        const sessionType = resolveLiveSessionType(rec.session_type)
        const liveEv = evaluateLiveSessionAccess(sessionType, student)
        if (!liveEv.ok) {
            denyReason =
                sessionType === "theory" ? "theory_access_denied" : "access_denied"
            console.log("[SECURE JOIN DENIED]", {
                reason: denyReason,
                session_id: sessionId,
                session_type: sessionType,
                entitlementReason: liveEv.reason,
            })
            return NextResponse.json(
                {
                    error:
                        sessionType === "theory"
                            ? "Theory class access denied"
                            : "Access denied",
                    code: denyReason,
                    reason: liveEv.reason,
                },
                { status: 403 }
            )
        }

        let theoryQuotaStatus: "already" | "claimed" | "available" | null = null

        if (sessionType === "theory" && student) {
            const quota = await assertOrClaimTheoryConsumption({
                supabase,
                student,
                sessionId,
                consume,
            })
            if (!quota.ok) {
                denyReason = quota.code
                console.log("[SECURE JOIN DENIED]", {
                    reason: denyReason,
                    session_id: sessionId,
                    session_type: sessionType,
                    consume,
                })
                return NextResponse.json(
                    {
                        error:
                            quota.code === "theory_quota_exceeded"
                                ? "Theory class quota exceeded"
                                : quota.error,
                        code: denyReason,
                    },
                    { status: 403 }
                )
            }
            theoryQuotaStatus = quota.status

            // Preview of a new Theory session: access/quota OK but never expose join_url.
            if (!theoryJoinUrlAllowed({ consume, status: quota.status })) {
                console.log("[SECURE JOIN PREVIEW]", {
                    session_id: sessionId,
                    user: verifiedEmail,
                    session_type: sessionType,
                    status: quota.status,
                })
                return NextResponse.json({
                    preview: true,
                    can_join: true,
                    already_consumed: false,
                })
            }
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

        console.log("[SECURE JOIN SUCCESS]", {
            session_id: sessionId,
            user: verifiedEmail,
            session_type: sessionType,
            consume,
            theory_quota_status: theoryQuotaStatus,
        })
        return NextResponse.json({ join_url: joinUrl })
    } catch (e: unknown) {
        console.error("[api/session/join] POST", e)
        console.log("[SECURE JOIN DENIED]", { reason: "internal_error" })
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
