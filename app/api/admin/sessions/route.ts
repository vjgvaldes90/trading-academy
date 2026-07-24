import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { canJoinLiveSessionNow, startAt, type DbSession } from "@/lib/sessions"

export const runtime = "nodejs"

export async function GET() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const supabase = createSupabaseServiceRoleClient()

        const { data: sessions, error: sessionsErr } = await supabase
            .from("sessions")
            .select("*")
            .eq("status", "active")

        if (sessionsErr) {
            console.error("[api/admin/sessions] sessions query error", sessionsErr)
            return NextResponse.json(
                { error: "Failed to load admin sessions", details: sessionsErr.message },
                { status: 500 }
            )
        }

        const now = new Date()
        const payload = (sessions ?? []).map((row) => {
            const r = row as Record<string, unknown>
            const id = typeof r.id === "string" ? r.id : ""
            const date =
                typeof r.date === "string"
                    ? r.date
                    : typeof r.session_date === "string"
                      ? r.session_date
                      : null
            const time =
                typeof r.time === "string"
                    ? r.time
                    : typeof r.session_hour === "string"
                      ? r.session_hour
                      : null
            const dbSession: DbSession = {
                id,
                day: null,
                date,
                time,
                link: null,
                is_live: r.is_live === true,
            }
            const nearStart = canJoinLiveSessionNow(dbSession, now)
            const startsAt = startAt(dbSession)
            const started = startsAt ? now.getTime() >= startsAt.getTime() : false
            return {
                id,
                title: typeof r.title === "string" ? r.title : null,
                date,
                time,
                status: typeof r.status === "string" ? r.status : "active",
                is_live: started || r.is_live === true,
                starts_at: startsAt ? startsAt.toISOString() : null,
                starts_soon: nearStart,
                created_by_admin_email:
                    typeof r.created_by_admin_email === "string" ? r.created_by_admin_email : null,
                last_edited_by_admin_email:
                    typeof r.last_edited_by_admin_email === "string" ? r.last_edited_by_admin_email : null,
                last_hosted_by_admin_email:
                    typeof r.last_hosted_by_admin_email === "string" ? r.last_hosted_by_admin_email : null,
                last_hosted_at: typeof r.last_hosted_at === "string" ? r.last_hosted_at : null,
            }
        })

        return NextResponse.json(payload)
    } catch (err: unknown) {
        console.error("[api/admin/sessions] GET", err)
        return NextResponse.json(
            { error: "Internal error", details: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        )
    }
}
