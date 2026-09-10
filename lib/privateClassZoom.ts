/**
 * Private Class Stage 4 — ensure Zoom meeting after payment (idempotent).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
    PRIVATE_CLASS_DURATION_MINUTES,
    PRIVATE_CLASS_REQUEST_SELECT,
    PRIVATE_CLASS_TIME_ZONE,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"
import {
    buildZoomStartTime,
    createZoomMeeting,
    deleteZoomMeeting,
    type ZoomMeetingDetails,
} from "@/lib/zoom"

export type EnsurePrivateClassZoomResult = {
    meetingId: string
    joinUrl: string
    startUrl: string
    created: boolean
}

const ZOOM_LOAD_SELECT = PRIVATE_CLASS_REQUEST_SELECT

function hasMeetingId(row: PrivateClassRequestRow): boolean {
    return typeof row.zoom_meeting_id === "string" && row.zoom_meeting_id.trim().length > 0
}

function existingMeetingPayload(row: PrivateClassRequestRow): EnsurePrivateClassZoomResult {
    return {
        meetingId: String(row.zoom_meeting_id).trim(),
        joinUrl: typeof row.zoom_join_url === "string" ? row.zoom_join_url.trim() : "",
        startUrl: typeof row.zoom_start_url === "string" ? row.zoom_start_url.trim() : "",
        created: false,
    }
}

/**
 * Guarantee a Zoom meeting for a paid Private Class request.
 * Creates only when status is paid (or confirmed without meeting) and zoom_meeting_id is null.
 * DB conditional update is the final duplicate barrier.
 */
export async function ensurePrivateClassZoomMeeting(args: {
    supabase: SupabaseClient
    requestId: string
}): Promise<EnsurePrivateClassZoomResult> {
    const { supabase, requestId } = args

    const { data: row, error: loadErr } = await supabase
        .from("private_class_requests")
        .select(ZOOM_LOAD_SELECT)
        .eq("id", requestId)
        .maybeSingle()

    if (loadErr) {
        console.error("[private-class-zoom] load failed", loadErr.message)
        throw new Error(`private_class_zoom_load_failed:${loadErr.message}`)
    }
    if (!row) {
        throw new Error("private_class_zoom_request_not_found")
    }

    const request = row as PrivateClassRequestRow
    const status = String(request.status ?? "")

    if (status === "confirmed" && hasMeetingId(request)) {
        console.log("[private-class-zoom] already confirmed — noop", { requestId })
        return existingMeetingPayload(request)
    }

    if (hasMeetingId(request)) {
        // Meeting exists but status may still be paid — promote to confirmed.
        if (status === "paid") {
            const { error: promoteErr } = await supabase
                .from("private_class_requests")
                .update({ status: "confirmed" })
                .eq("id", requestId)
                .eq("status", "paid")
                .not("zoom_meeting_id", "is", null)
            if (promoteErr) {
                console.error("[private-class-zoom] promote confirmed failed", promoteErr.message)
                throw new Error(`private_class_zoom_promote_failed:${promoteErr.message}`)
            }
        }
        return existingMeetingPayload(request)
    }

    // Create only for paid (normal) or confirmed-without-meeting (recovery).
    if (status !== "paid" && status !== "confirmed") {
        console.warn("[private-class-zoom] refusing create for status", { requestId, status })
        throw new Error(`private_class_zoom_invalid_status:${status}`)
    }

    const dateYmd = String(request.requested_date ?? "").trim()
    const timeRaw = String(request.requested_time ?? "").trim()
    const email = String(request.student_email ?? "").trim() || "student"
    const duration =
        typeof request.duration_minutes === "number" && request.duration_minutes > 0
            ? request.duration_minutes
            : PRIVATE_CLASS_DURATION_MINUTES

    let startTime: string
    try {
        startTime = buildZoomStartTime(dateYmd, timeRaw)
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(`private_class_zoom_invalid_slot:${msg}`)
    }

    const topic = `Smart Option Academy — Private Class 1:1 — ${email}`

    let meeting: ZoomMeetingDetails
    try {
        meeting = await createZoomMeeting({
            topic,
            start_time: startTime,
            duration,
            timezone: PRIVATE_CLASS_TIME_ZONE,
        })
    } catch (e) {
        console.error("[private-class-zoom] createZoomMeeting failed", e)
        throw e
    }

    const zoomCreatedAt = new Date().toISOString()
    const { data: updated, error: updateErr } = await supabase
        .from("private_class_requests")
        .update({
            status: "confirmed",
            zoom_meeting_id: meeting.meeting_id,
            zoom_join_url: meeting.join_url,
            zoom_start_url: meeting.start_url,
            zoom_password: meeting.password || null,
            zoom_created_at: zoomCreatedAt,
        })
        .eq("id", requestId)
        .in("status", ["paid", "confirmed"])
        .is("zoom_meeting_id", null)
        .select("id, zoom_meeting_id, zoom_join_url, zoom_start_url")
        .maybeSingle()

    if (updateErr) {
        console.error("[private-class-zoom] DB save failed — rolling back Zoom", updateErr.message)
        try {
            await deleteZoomMeeting(meeting.meeting_id)
        } catch (rollbackErr) {
            console.error("[private-class-zoom] Zoom rollback delete failed", rollbackErr)
        }
        throw new Error(`private_class_zoom_db_save_failed:${updateErr.message}`)
    }

    if (!updated) {
        // Race: another worker won — load winner; delete our orphan meeting if different.
        const { data: again } = await supabase
            .from("private_class_requests")
            .select(ZOOM_LOAD_SELECT)
            .eq("id", requestId)
            .maybeSingle()

        const againRow = again as PrivateClassRequestRow | null
        if (againRow && hasMeetingId(againRow)) {
            const winnerId = String(againRow.zoom_meeting_id).trim()
            if (winnerId !== meeting.meeting_id) {
                try {
                    await deleteZoomMeeting(meeting.meeting_id)
                } catch (orphanErr) {
                    console.error("[private-class-zoom] orphan meeting cleanup failed", orphanErr)
                }
            }
            console.log("[private-class-zoom] race lost — using existing meeting", {
                requestId,
                meetingId: winnerId,
            })
            return existingMeetingPayload(againRow)
        }

        try {
            await deleteZoomMeeting(meeting.meeting_id)
        } catch (rollbackErr) {
            console.error("[private-class-zoom] Zoom rollback after empty update failed", rollbackErr)
        }
        throw new Error("private_class_zoom_transition_conflict")
    }

    console.log("[private-class-zoom] confirmed with Zoom", {
        requestId,
        meetingId: meeting.meeting_id,
    })

    return {
        meetingId: meeting.meeting_id,
        joinUrl: meeting.join_url,
        startUrl: meeting.start_url,
        created: true,
    }
}
