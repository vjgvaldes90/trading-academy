import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { SESSION_COOKIE, SESSION_TOKEN_COOKIE, USER_EMAIL_COOKIE } from "@/lib/authCookies"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import { isWithinAdminHostWindow } from "@/lib/sessions"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Body = { session_id?: unknown }

type CookieFlags = {
    user_email: boolean
    session_token: boolean
    session: boolean
}

function logAdminAuthDebug(params: {
    cookieFlags: CookieFlags
    adminEmailDetected: string | null
    denialReason: string | null
    extra?: Record<string, unknown>
}) {
    const { cookieFlags, adminEmailDetected, denialReason, extra } = params
    const authSource = adminEmailDetected
        ? "verified_trading_student_session"
        : "missing_or_invalid_session_cookies"
    console.log("[ADMIN AUTH DEBUG]", {
        cookieFlags,
        adminEmailDetected,
        authSource,
        denialReason,
        ...extra,
    })
}

/**
 * Host start uses the same verified academy session as dashboard routes guarded by
 * `proxy.ts` (`user_email` + `session_token` matching `trading_students`).
 * Other `/api/admin/*` routes do not check identity; this endpoint does so Zoom host URLs
 * are not returned anonymously. There is no env email allowlist (parity with open `/admin` UI).
 */
export async function POST(req: Request) {
    let cookieFlags: CookieFlags = {
        user_email: false,
        session_token: false,
        session: false,
    }
    let verifiedEmail: string | null = null

    try {
        const jar = await cookies()
        cookieFlags = {
            user_email: Boolean(jar.get(USER_EMAIL_COOKIE)?.value?.trim()),
            session_token: Boolean(jar.get(SESSION_TOKEN_COOKIE)?.value?.trim()),
            session: Boolean(jar.get(SESSION_COOKIE)?.value?.trim()),
        }
        verifiedEmail = await getVerifiedStudentEmailFromCookies()

        logAdminAuthDebug({
            cookieFlags,
            adminEmailDetected: verifiedEmail,
            denialReason: verifiedEmail ? null : "unauthorized",
        })

        if (!verifiedEmail) {
            console.log("[ADMIN SESSION START DENIED]", { reason: "unauthorized" })
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        let body: Body
        try {
            body = (await req.json()) as Body
        } catch {
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "invalid_json",
            })
            console.log("[ADMIN SESSION START DENIED]", {
                reason: "invalid_json",
                admin: verifiedEmail,
            })
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : ""
        if (!sessionId || !UUID_RE.test(sessionId)) {
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "invalid_session_id",
            })
            console.log("[ADMIN SESSION START DENIED]", {
                reason: "invalid_session_id",
                admin: verifiedEmail,
            })
            return NextResponse.json({ error: "Invalid session_id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: row, error } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle()

        if (error) {
            console.error("[api/admin/session/start] session lookup", error)
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "db_error",
                extra: { session_id: sessionId },
            })
            console.log("[ADMIN SESSION START DENIED]", { reason: "db_error", admin: verifiedEmail })
            return NextResponse.json({ error: "Failed to load session" }, { status: 500 })
        }
        if (!row) {
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "not_found",
                extra: { session_id: sessionId },
            })
            console.log("[ADMIN SESSION START DENIED]", {
                reason: "not_found",
                session_id: sessionId,
                admin: verifiedEmail,
            })
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        const rec = row as Record<string, unknown>
        const status = typeof rec.status === "string" ? rec.status.trim().toLowerCase() : ""
        if (status !== "active") {
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "inactive",
                extra: { session_id: sessionId },
            })
            console.log("[ADMIN SESSION START DENIED]", {
                reason: "inactive",
                session_id: sessionId,
                admin: verifiedEmail,
            })
            return NextResponse.json({ error: "Session is not active" }, { status: 403 })
        }

        const session = mapSupabaseSessionRow(rec)
        if (!session) {
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "invalid_session_data",
                extra: { session_id: sessionId },
            })
            console.log("[ADMIN SESSION START DENIED]", {
                reason: "invalid_session_data",
                session_id: sessionId,
                admin: verifiedEmail,
            })
            return NextResponse.json({ error: "Invalid session data" }, { status: 500 })
        }

        const now = new Date()
        if (!isWithinAdminHostWindow(session, now)) {
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "too_early",
                extra: { session_id: sessionId },
            })
            console.log("[ADMIN SESSION START DENIED]", {
                reason: "too_early",
                session_id: sessionId,
                admin: verifiedEmail,
            })
            return NextResponse.json(
                { error: "Host access opens 15 minutes before session start", code: "too_early" },
                { status: 403 }
            )
        }

        const zoomStart =
            typeof rec.zoom_start_url === "string" && rec.zoom_start_url.trim()
                ? rec.zoom_start_url.trim()
                : null
        const fallbackLink = typeof rec.link === "string" && rec.link.trim() ? rec.link.trim() : null
        const startUrl = zoomStart ?? fallbackLink
        if (!startUrl) {
            logAdminAuthDebug({
                cookieFlags,
                adminEmailDetected: verifiedEmail,
                denialReason: "no_host_url",
                extra: { session_id: sessionId },
            })
            console.log("[ADMIN SESSION START DENIED]", {
                reason: "no_host_url",
                session_id: sessionId,
                admin: verifiedEmail,
            })
            return NextResponse.json({ error: "No host meeting URL configured" }, { status: 503 })
        }

        logAdminAuthDebug({
            cookieFlags,
            adminEmailDetected: verifiedEmail,
            denialReason: null,
            extra: { session_id: sessionId },
        })
        console.log("[ADMIN SESSION START SUCCESS]", { session_id: sessionId, admin: verifiedEmail })
        return NextResponse.json({ zoom_start_url: startUrl })
    } catch (e: unknown) {
        console.error("[api/admin/session/start] POST", e)
        logAdminAuthDebug({
            cookieFlags,
            adminEmailDetected: verifiedEmail,
            denialReason: "internal_exception",
            extra: { message: e instanceof Error ? e.message : String(e) },
        })
        console.log("[ADMIN SESSION START DENIED]", { reason: "internal" })
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
