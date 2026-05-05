import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { SESSION_COOKIE } from "@/lib/authCookies"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import { mapSupabaseSessionRow } from "@/lib/mapSessionRow"
import { isWithinAdminHostWindow } from "@/lib/sessions"
import { DASHBOARD_CLIENT_EMAIL_COOKIE } from "@/lib/studentLocalStorage"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Body = { session_id?: unknown }

function normalizedAdminEmail(): string {
    return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? ""
}

async function resolveAdminEmail(adminEmailFromBody: string): Promise<string | null> {
    const adminEmail = normalizedAdminEmail()
    if (!adminEmail || !adminEmailFromBody || adminEmailFromBody !== adminEmail) return null

    const strictVerified = await getVerifiedStudentEmailFromCookies()
    if (strictVerified && strictVerified === adminEmailFromBody) return strictVerified

    const jar = await cookies()
    const candidates = [
        jar.get(SESSION_COOKIE)?.value?.trim().toLowerCase() ?? "",
        jar.get(DASHBOARD_CLIENT_EMAIL_COOKIE)?.value?.trim().toLowerCase() ?? "",
    ].filter(Boolean)

    const supabase = createSupabaseServiceRoleClient()
    for (const email of candidates) {
        if (!EMAIL_RE.test(email)) continue
        if (email !== adminEmailFromBody) continue
        const { data, error } = await supabase
            .from("trading_students")
            .select("email, is_active")
            .eq("email", email)
            .maybeSingle()
        if (error || !data) continue
        if ((data as { is_active?: unknown }).is_active === false) continue
        return email
    }

    return null
}

export async function POST(req: Request) {
    try {
        const adminEmail = normalizedAdminEmail()
        if (!adminEmail) {
            return NextResponse.json(
                { error: "Server misconfiguration: missing ADMIN_EMAIL", code: "admin_email_missing" },
                { status: 503 }
            )
        }

        const body = (await req.json().catch(() => null)) as
            | (Body & { admin_email?: unknown })
            | null
        const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : ""
        const adminEmailFromBody =
            typeof body?.admin_email === "string" ? body.admin_email.trim().toLowerCase() : ""
        if (!adminEmailFromBody || !EMAIL_RE.test(adminEmailFromBody)) {
            return NextResponse.json({ error: "Invalid admin_email", code: "invalid_admin_email" }, { status: 400 })
        }
        if (adminEmailFromBody !== adminEmail) {
            return NextResponse.json({ error: "Unauthorized", code: "admin_email_mismatch" }, { status: 401 })
        }

        const verifiedAdmin = await resolveAdminEmail(adminEmailFromBody)
        if (!verifiedAdmin) {
            return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 })
        }

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

        console.log("[ADMIN SESSION HOST JOIN SUCCESS]", { session_id: sessionId, admin: verifiedAdmin })
        return NextResponse.json({ join_url: hostUrl, zoom_start_url: hostUrl })
    } catch (e) {
        console.error("[api/admin/session/host-join] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
