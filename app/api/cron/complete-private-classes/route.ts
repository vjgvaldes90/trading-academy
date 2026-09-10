import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { completeDuePrivateClasses } from "@/lib/privateClassCompletion"
import { runPrivateClassCompletionSelfChecks } from "@/lib/privateClassCompletionLogic"

export const runtime = "nodejs"

/**
 * Hourly cron: confirmed Private Classes past end (ET + duration) → completed.
 * Secured with CRON_SECRET (Authorization: Bearer <secret> or x-cron-secret).
 * Optional: ?self_check=1 runs timing self-checks only (no DB writes).
 */
async function handle(req: Request) {
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

    const url = new URL(req.url)
    if (url.searchParams.get("self_check") === "1") {
        const checks = runPrivateClassCompletionSelfChecks()
        return NextResponse.json({
            ok: checks.ok,
            self_check: true,
            results: checks.results,
        })
    }

    try {
        const supabase = createSupabaseServiceRoleClient()
        const result = await completeDuePrivateClasses({ supabase })
        if (result.failedIds.length > 0) {
            return NextResponse.json(
                {
                    ok: false,
                    code: "partial_failure",
                    scanned: result.scanned,
                    completed: result.completedIds.length,
                    completed_ids: result.completedIds,
                    failed_ids: result.failedIds,
                },
                { status: 500 }
            )
        }
        return NextResponse.json({
            ok: true,
            scanned: result.scanned,
            completed: result.completedIds.length,
            completed_ids: result.completedIds,
        })
    } catch (e) {
        console.error("[cron/complete-private-classes]", e)
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
