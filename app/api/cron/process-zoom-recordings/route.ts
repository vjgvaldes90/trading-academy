import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { ZOOM_RECORDING_BUDGET_MS, processDueZoomRecordingJobs } from "@/lib/zoomRecordingJobs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const MAX_JOBS_PER_RUN = 3

/**
 * Every 15 min: continue / retry Zoom recording → Google Drive jobs.
 * Secured with CRON_SECRET (Authorization: Bearer <secret> or x-cron-secret).
 */
async function handle(req: Request) {
    const startedAt = Date.now()
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
        const results = await processDueZoomRecordingJobs({
            supabase,
            headers: req.headers,
            deadlineMs: startedAt + ZOOM_RECORDING_BUDGET_MS,
            maxJobs: MAX_JOBS_PER_RUN,
        })
        console.log("[ZOOM RECORDING JOB] cron run", {
            processed: results.length,
            outcomes: results.map((r) => r.outcome),
        })
        return NextResponse.json({ ok: true, processed: results.length, results })
    } catch (e) {
        console.error("[cron/process-zoom-recordings]", e instanceof Error ? e.message.slice(0, 300) : "unknown")
        return NextResponse.json({ error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}

/** Vercel Cron invokes GET. */
export async function GET(req: Request) {
    return handle(req)
}

/** Optional POST for manual protected runs. */
export async function POST(req: Request) {
    return handle(req)
}
