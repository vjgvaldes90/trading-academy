import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    PRIVATE_CLASS_REQUEST_SELECT,
    adminPrivateClassRequest,
    privateClassRequestIdSchema,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"
import { ensurePrivateClassZoomMeeting } from "@/lib/privateClassZoom"
import { ZoomApiError, ZoomConfigError } from "@/lib/zoom"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

const ALLOWED_ENSURE_STATUSES = new Set(["paid", "confirmed"])

/**
 * Admin recovery: paid/confirmed → ensure Zoom meeting (idempotent).
 * Does not touch Stripe checkout, payments, or webhook claims.
 */
export async function POST(_req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id: rawId } = await context.params
        const idParsed = privateClassRequestIdSchema.safeParse(rawId)
        if (!idParsed.success) {
            return NextResponse.json(
                { ok: false, error: "Invalid request id", code: "validation_error" },
                { status: 400 }
            )
        }
        const requestId = idParsed.data

        const supabase = createSupabaseServiceRoleClient()
        const { data: existing, error: loadErr } = await supabase
            .from("private_class_requests")
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .eq("id", requestId)
            .maybeSingle()

        if (loadErr) {
            console.error("[ensure-zoom] load", loadErr.message)
            return NextResponse.json(
                { ok: false, error: "Failed to load private class request", code: "db_load_failed" },
                { status: 500 }
            )
        }
        if (!existing) {
            return NextResponse.json(
                { ok: false, error: "Request not found", code: "not_found" },
                { status: 404 }
            )
        }

        const row = existing as PrivateClassRequestRow
        const status = String(row.status ?? "")
        if (!ALLOWED_ENSURE_STATUSES.has(status)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: `Cannot ensure Zoom for status "${status}"`,
                    code: "invalid_status",
                    status,
                },
                { status: 409 }
            )
        }

        let zoomResult: Awaited<ReturnType<typeof ensurePrivateClassZoomMeeting>>
        try {
            zoomResult = await ensurePrivateClassZoomMeeting({ supabase, requestId })
        } catch (e) {
            console.error("[ensure-zoom] ensurePrivateClassZoomMeeting failed", e)
            if (e instanceof ZoomConfigError) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Zoom is not configured on this server",
                        code: "zoom_not_configured",
                        details: e.message,
                    },
                    { status: 503 }
                )
            }
            if (e instanceof ZoomApiError) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Zoom API failed while creating or verifying the meeting",
                        code: "zoom_api_failed",
                        details: e.message,
                    },
                    { status: 502 }
                )
            }
            const message = e instanceof Error ? e.message : "ensure_zoom_failed"
            return NextResponse.json(
                { ok: false, error: "Failed to ensure Zoom meeting", code: "ensure_zoom_failed", details: message },
                { status: 500 }
            )
        }

        const { data: refreshed, error: refreshErr } = await supabase
            .from("private_class_requests")
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .eq("id", requestId)
            .maybeSingle()

        if (refreshErr || !refreshed) {
            console.error("[ensure-zoom] refresh after ensure", refreshErr?.message)
            return NextResponse.json(
                {
                    ok: true,
                    created: zoomResult.created,
                    meeting_id: zoomResult.meetingId,
                    request: null,
                    warning: "Zoom ensure succeeded but failed to reload request row",
                },
                { status: 200 }
            )
        }

        return NextResponse.json({
            ok: true,
            created: zoomResult.created,
            meeting_id: zoomResult.meetingId,
            request: adminPrivateClassRequest(refreshed as PrivateClassRequestRow),
        })
    } catch (e) {
        console.error("[api/admin/private-class-requests/[id]/ensure-zoom] POST", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
