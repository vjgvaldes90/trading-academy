import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    PRIVATE_CLASS_DURATION_MINUTES,
    PRIVATE_CLASS_REQUEST_SELECT,
    PRIVATE_CLASS_TIME_ZONE,
    adminPrivateClassRequest,
    isPrivateClassSlotInPast,
    normalizeRequestedTime,
    privateClassRequestIdSchema,
    reschedulePrivateClassRequestSchema,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"
import { sendPrivateClassRescheduleEmail } from "@/lib/resend"
import { buildZoomStartTime, updateZoomMeeting, ZoomApiError, ZoomConfigError } from "@/lib/zoom"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Admin Stage 5: reschedule a confirmed Private Class (date/time only).
 * Reuses the existing Zoom meeting via updateZoomMeeting — never creates a new one.
 * Does not touch Stripe, payment status, price, or request status.
 */
export async function POST(req: Request, context: RouteContext) {
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

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { ok: false, error: "Invalid JSON body", code: "validation_error" },
                { status: 400 }
            )
        }

        const parsed = reschedulePrivateClassRequestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Invalid requested_date / requested_time",
                    code: "validation_error",
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            )
        }

        const newDate = parsed.data.requested_date
        const newTime = normalizeRequestedTime(parsed.data.requested_time)

        if (isPrivateClassSlotInPast(newDate, newTime)) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "New date/time must be in the future (America/New_York)",
                    code: "slot_in_past",
                },
                { status: 400 }
            )
        }

        let newStartTime: string
        try {
            newStartTime = buildZoomStartTime(newDate, newTime)
        } catch (e) {
            const message = e instanceof Error ? e.message : "invalid_slot"
            return NextResponse.json(
                { ok: false, error: "Invalid date/time for Zoom", code: "invalid_slot", details: message },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: existing, error: loadErr } = await supabase
            .from("private_class_requests")
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .eq("id", requestId)
            .maybeSingle()

        if (loadErr) {
            console.error("[private-class-reschedule] load", loadErr.message)
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
        if (status !== "confirmed") {
            return NextResponse.json(
                {
                    ok: false,
                    error: `Only confirmed private classes can be rescheduled (status="${status}")`,
                    code: "invalid_status",
                    status,
                },
                { status: 409 }
            )
        }

        const meetingId =
            typeof row.zoom_meeting_id === "string" ? row.zoom_meeting_id.trim() : ""
        if (!meetingId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Confirmed private class is missing zoom_meeting_id",
                    code: "missing_zoom_meeting",
                },
                { status: 409 }
            )
        }

        const oldDate = String(row.requested_date ?? "").trim()
        const oldTime = normalizeRequestedTime(String(row.requested_time ?? "").trim())

        let oldStartTime: string
        try {
            oldStartTime = buildZoomStartTime(oldDate, oldTime)
        } catch (e) {
            const message = e instanceof Error ? e.message : "invalid_current_slot"
            console.error("[private-class-reschedule] current slot invalid", message)
            return NextResponse.json(
                {
                    ok: false,
                    error: "Current stored date/time is invalid; cannot safely reschedule",
                    code: "invalid_current_slot",
                    details: message,
                },
                { status: 500 }
            )
        }

        const duration =
            typeof row.duration_minutes === "number" && row.duration_minutes > 0
                ? row.duration_minutes
                : PRIVATE_CLASS_DURATION_MINUTES

        // A) Zoom first — on failure, leave DB unchanged.
        try {
            await updateZoomMeeting(meetingId, {
                start_time: newStartTime,
                duration,
                timezone: PRIVATE_CLASS_TIME_ZONE,
            })
        } catch (e) {
            console.error("[private-class-reschedule] updateZoomMeeting failed", e)
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
                        error: "Zoom API failed while updating the meeting",
                        code: "zoom_api_failed",
                        details: e.message,
                    },
                    { status: 502 }
                )
            }
            return NextResponse.json(
                {
                    ok: false,
                    error: "Failed to update Zoom meeting",
                    code: "zoom_update_failed",
                    details: e instanceof Error ? e.message : String(e),
                },
                { status: 500 }
            )
        }

        // B) DB date/time only — never touch payment/status/price/zoom URLs.
        const { data: updated, error: updateErr } = await supabase
            .from("private_class_requests")
            .update({
                requested_date: newDate,
                requested_time: newTime,
            })
            .eq("id", requestId)
            .eq("status", "confirmed")
            .eq("zoom_meeting_id", meetingId)
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .maybeSingle()

        if (updateErr || !updated) {
            console.error(
                "[private-class-reschedule] DB update failed — reverting Zoom",
                updateErr?.message ?? "empty_update"
            )
            try {
                await updateZoomMeeting(meetingId, {
                    start_time: oldStartTime,
                    duration,
                    timezone: PRIVATE_CLASS_TIME_ZONE,
                })
            } catch (rollbackErr) {
                console.error(
                    "[private-class-reschedule] CRITICAL: Zoom revert after DB failure failed",
                    rollbackErr
                )
            }
            return NextResponse.json(
                {
                    ok: false,
                    error: "Failed to save new date/time; Zoom was reverted when possible",
                    code: "db_update_failed",
                    details: updateErr?.message ?? "empty_update",
                },
                { status: 500 }
            )
        }

        const refreshed = updated as PrivateClassRequestRow

        // C) Email failure must not roll back Zoom/DB.
        const joinUrl =
            typeof refreshed.zoom_join_url === "string" && refreshed.zoom_join_url.trim()
                ? refreshed.zoom_join_url.trim()
                : null
        const emailResult = await sendPrivateClassRescheduleEmail({
            to: String(refreshed.student_email ?? "").trim(),
            studentName: null,
            newDateYmd: newDate,
            newTimeHms: newTime,
            zoomJoinUrl: joinUrl,
        })

        if (!emailResult.ok) {
            console.error("[private-class-reschedule] email failed (reschedule kept)", {
                requestId,
                error: emailResult.error,
            })
            return NextResponse.json({
                ok: true,
                email_sent: false,
                email_error: emailResult.error,
                warning: "rescheduled_but_email_failed",
                request: adminPrivateClassRequest(refreshed),
            })
        }

        return NextResponse.json({
            ok: true,
            email_sent: true,
            request: adminPrivateClassRequest(refreshed),
        })
    } catch (e) {
        console.error("[api/admin/private-class-requests/[id]/reschedule] POST", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
