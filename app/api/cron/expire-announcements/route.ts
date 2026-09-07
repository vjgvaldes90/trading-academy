import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { createAnnouncementsService } from "@/lib/announcements"

export const runtime = "nodejs"

/**
 * Periodic cleanup for expired academy announcements.
 * Secured with CRON_SECRET (Authorization: Bearer <secret> or x-cron-secret).
 * Configure in vercel.json; does not run without CRON_SECRET.
 */
export async function GET(req: Request) {
    const secret = process.env.CRON_SECRET?.trim()
    if (!secret) {
        return NextResponse.json(
            { error: "CRON_SECRET is not configured", code: "cron_not_configured" },
            { status: 503 }
        )
    }

    const auth = req.headers.get("authorization")?.trim() ?? ""
    const headerSecret = req.headers.get("x-cron-secret")?.trim() ?? ""
    const bearerOk = auth === `Bearer ${secret}`
    const headerOk = headerSecret === secret
    if (!bearerOk && !headerOk) {
        return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 })
    }

    try {
        const supabase = createSupabaseServiceRoleClient()
        const service = createAnnouncementsService(supabase)
        const result = await service.deleteExpiredAnnouncements()
        if (!result.ok) {
            return NextResponse.json(
                { error: result.error, code: result.code ?? "cleanup_failed" },
                { status: 500 }
            )
        }
        console.log("[cron/expire-announcements] deleted", result.data.deleted)
        return NextResponse.json({
            ok: true,
            deleted: result.data.deleted,
        })
    } catch (e) {
        console.error("[cron/expire-announcements]", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
