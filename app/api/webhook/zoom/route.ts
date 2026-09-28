import { after, NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    ZOOM_RECORDING_BUDGET_MS,
    processZoomRecordingJob,
    registerZoomRecordingFromWebhook,
} from "@/lib/zoomRecordingJobs"
import {
    buildZoomUrlValidationResponse,
    getZoomWebhookSecret,
    verifyZoomWebhookSignature,
} from "@/lib/zoomWebhook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Zoom webhook: endpoint.url_validation (CRC) and recording.completed.
 * The raw body is verified (x-zm-signature) before it is parsed.
 */
export async function POST(req: Request) {
    const startedAt = Date.now()
    const secret = getZoomWebhookSecret()
    if (!secret) {
        console.error("[ZOOM RECORDING] ZOOM_WEBHOOK_SECRET is not configured")
        return NextResponse.json({ error: "Webhook not configured", code: "not_configured" }, { status: 503 })
    }

    const rawBody = await req.text()
    const valid = verifyZoomWebhookSignature({
        rawBody,
        timestamp: req.headers.get("x-zm-request-timestamp"),
        signature: req.headers.get("x-zm-signature"),
        secret,
    })
    if (!valid) {
        console.warn("[ZOOM RECORDING] invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature", code: "invalid_signature" }, { status: 401 })
    }

    let body: unknown
    try {
        body = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: "Invalid JSON", code: "invalid_json" }, { status: 400 })
    }

    const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
    const event = typeof root.event === "string" ? root.event : ""

    if (event === "endpoint.url_validation") {
        const payload = root.payload && typeof root.payload === "object" ? (root.payload as Record<string, unknown>) : {}
        const plainToken = typeof payload.plainToken === "string" ? payload.plainToken : ""
        if (!plainToken) {
            return NextResponse.json({ error: "Missing plainToken", code: "invalid_payload" }, { status: 400 })
        }
        return NextResponse.json(buildZoomUrlValidationResponse(plainToken, secret))
    }

    if (event !== "recording.completed") {
        console.log("[ZOOM RECORDING] event ignored", { event })
        return NextResponse.json({ ok: true, ignored: true })
    }

    try {
        const supabase = createSupabaseServiceRoleClient()
        const result = await registerZoomRecordingFromWebhook(supabase, body)

        if (result.outcome === "created" && result.status === "pending") {
            const headers = new Headers(req.headers)
            const { jobId, downloadHint } = result
            after(async () => {
                await processZoomRecordingJob({
                    supabase,
                    jobId,
                    headers,
                    deadlineMs: startedAt + ZOOM_RECORDING_BUDGET_MS,
                    downloadHint,
                })
            })
        }

        return NextResponse.json({
            ok: true,
            outcome: result.outcome,
            ...(result.outcome === "ignored" ? { reason: result.reason } : {}),
        })
    } catch (e) {
        console.error("[ZOOM RECORDING] webhook processing error", e instanceof Error ? e.message.slice(0, 300) : "unknown")
        return NextResponse.json({ error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
