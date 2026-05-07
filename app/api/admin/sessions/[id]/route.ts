import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { notifyConfirmedBookingsOfSessionChange } from "@/lib/notifySessionBookingStudents"
import {
    buildZoomStartTime,
    deleteZoomMeeting,
    updateZoomMeeting,
    ZoomApiError,
    ZoomConfigError,
} from "@/lib/zoom"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteCtx = { params: Promise<{ id: string }> }

function parseCapacity(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
        return value
    }
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number.parseInt(value.trim(), 10)
        if (Number.isFinite(n) && String(n) === value.trim()) return n
    }
    return null
}

function sessionRowDate(row: Record<string, unknown>): string | null {
    const a = row.session_date ?? row.date
    return typeof a === "string" && a.trim() !== "" ? a.trim() : null
}

async function zoomDeleteIfPresent(zoomMeetingId: string | null | undefined): Promise<void> {
    if (typeof zoomMeetingId !== "string" || zoomMeetingId.trim() === "") return
    await deleteZoomMeeting(zoomMeetingId.trim())
}

const SESSION_CLEAR_CANCEL: Record<string, unknown> = {
    status: "cancelled",
    link: null,
    zoom_meeting_id: null,
    zoom_start_url: null,
    zoom_password: null,
}

export async function PATCH(req: Request, context: RouteCtx) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response
        const adminEmail = auth.email

        const { id } = await context.params
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const b = body as Record<string, unknown>
        const hasTime = Object.prototype.hasOwnProperty.call(b, "time")
        const hasCapacity = Object.prototype.hasOwnProperty.call(b, "capacity")
        const hasStatus = Object.prototype.hasOwnProperty.call(b, "status")

        if (!hasTime && !hasCapacity && !hasStatus) {
            return NextResponse.json(
                { error: "Provide at least one of: time, capacity, status" },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()

        if (hasCapacity && !hasTime && !hasStatus) {
            const cap = parseCapacity(b.capacity)
            if (cap === null) {
                return NextResponse.json({ error: "capacity must be an integer" }, { status: 400 })
            }
            if (cap < 0) {
                return NextResponse.json({ error: "capacity must be non-negative" }, { status: 400 })
            }

            const { data, error } = await supabase
                .from("sessions")
                .update({ capacity: cap, last_edited_by_admin_email: adminEmail })
                .eq("id", id)
                .select("id, session_date, session_hour, date, time, capacity, link, status, zoom_meeting_id, zoom_start_url")
                .single()

            if (error) {
                if (error.code === "PGRST116") {
                    return NextResponse.json({ error: "Session not found" }, { status: 404 })
                }
                console.error("[api/admin/sessions/[id]] PATCH capacity-only update error", error)
                return NextResponse.json(
                    { error: "Failed to update session", details: error.message },
                    { status: 500 }
                )
            }

            await notifyConfirmedBookingsOfSessionChange(
                supabase,
                id,
                "Una sesión en la que estabas inscrito ha sido actualizada (hora o cupo). Revisa el calendario."
            )

            return NextResponse.json(data)
        }

        if (hasStatus) {
            const raw = b.status
            const s = typeof raw === "string" ? raw.trim().toLowerCase() : ""
            if (s !== "cancelled") {
                return NextResponse.json(
                    { error: 'When provided, status must be "cancelled" (soft cancel)' },
                    { status: 400 }
                )
            }

            const { data: row, error: fetchErr } = await supabase
                .from("sessions")
                .select("zoom_meeting_id")
                .eq("id", id)
                .maybeSingle()

            if (fetchErr) {
                console.error("[api/admin/sessions/[id]] PATCH cancel fetch", fetchErr)
                return NextResponse.json(
                    { error: "Failed to load session", details: fetchErr.message },
                    { status: 500 }
                )
            }
            if (!row) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 })
            }

            const zm = typeof (row as { zoom_meeting_id?: unknown }).zoom_meeting_id === "string"
                ? (row as { zoom_meeting_id: string }).zoom_meeting_id
                : null

            try {
                await zoomDeleteIfPresent(zm)
            } catch (e: unknown) {
                if (e instanceof ZoomApiError) {
                    return NextResponse.json(
                        { error: "Could not cancel Zoom meeting; session not updated", details: e.message },
                        { status: 502 }
                    )
                }
                if (e instanceof ZoomConfigError) {
                    return NextResponse.json({ error: "Zoom is not configured", details: e.message }, { status: 500 })
                }
                throw e
            }

            const { data, error } = await supabase
                .from("sessions")
                .update({ ...SESSION_CLEAR_CANCEL, last_edited_by_admin_email: adminEmail })
                .eq("id", id)
                .select("id, session_date, session_hour, date, time, capacity, link, status, zoom_meeting_id, zoom_start_url")
                .single()

            if (error) {
                console.error("[api/admin/sessions/[id]] PATCH soft-cancel update error", error)
                return NextResponse.json(
                    { error: "Failed to cancel session after Zoom delete", details: error.message },
                    { status: 500 }
                )
            }

            await notifyConfirmedBookingsOfSessionChange(
                supabase,
                id,
                "Una sesión en la que estabas inscrito ha sido cancelada. Revisa «Tus reservas»."
            )

            return NextResponse.json(data)
        }

        const timeRaw = typeof b.time === "string" ? b.time.trim() : ""
        if (!timeRaw) {
            return NextResponse.json({ error: "time must be a non-empty string" }, { status: 400 })
        }

        const capPatch = parseCapacity(b.capacity)
        let capacityNum: number | undefined
        if (hasCapacity) {
            if (capPatch === null) {
                return NextResponse.json({ error: "capacity must be an integer" }, { status: 400 })
            }
            if (capPatch < 0) {
                return NextResponse.json({ error: "capacity must be non-negative" }, { status: 400 })
            }
            capacityNum = capPatch
        }

        const { data: existing, error: exErr } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle()

        if (exErr) {
            console.error("[api/admin/sessions/[id]] PATCH load session", exErr)
            return NextResponse.json(
                { error: "Failed to load session", details: exErr.message },
                { status: 500 }
            )
        }
        if (!existing || typeof existing !== "object") {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        const rec = existing as Record<string, unknown>
        const day = sessionRowDate(rec)
        const zoomMeetingId =
            typeof rec.zoom_meeting_id === "string" && rec.zoom_meeting_id.trim() !== ""
                ? rec.zoom_meeting_id.trim()
                : ""

        if (!day) {
            return NextResponse.json(
                { error: "Session is missing calendar date in database; fix the row before rescheduling" },
                { status: 400 }
            )
        }

        let zoomUrls: {
            join_url: string
            start_url: string
            password: string
            meeting_id: string
        } | null = null

        if (zoomMeetingId) {
            let startZoom: string
            try {
                startZoom = buildZoomStartTime(day, timeRaw)
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Invalid time"
                return NextResponse.json({ error: "Invalid session time", details: msg }, { status: 400 })
            }
            try {
                zoomUrls = await updateZoomMeeting(zoomMeetingId, { start_time: startZoom })
            } catch (e: unknown) {
                if (e instanceof ZoomApiError) {
                    return NextResponse.json(
                        { error: "Could not update Zoom meeting; session hours were not saved", details: e.message },
                        { status: 502 }
                    )
                }
                if (e instanceof ZoomConfigError) {
                    return NextResponse.json({ error: "Zoom is not configured", details: e.message }, { status: 500 })
                }
                throw e
            }
        } else {
            return NextResponse.json(
                {
                    error: "This session has no Zoom meeting id; create a new session instead of editing the link manually.",
                    details: "legacy_or_invalid_session",
                },
                { status: 422 }
            )
        }

        const dbUpdate: Record<string, unknown> = {
            session_hour: timeRaw,
            last_edited_by_admin_email: adminEmail,
        }

        if (capacityNum !== undefined) {
            dbUpdate.capacity = capacityNum
        }
        if (zoomUrls) {
            dbUpdate.link = zoomUrls.join_url
            dbUpdate.zoom_meeting_id = zoomUrls.meeting_id
            dbUpdate.zoom_start_url = zoomUrls.start_url
            dbUpdate.zoom_password = zoomUrls.password || null
        }

        const { data, error } = await supabase
            .from("sessions")
            .update(dbUpdate)
            .eq("id", id)
            .select("id, session_date, session_hour, date, time, capacity, link, status, zoom_meeting_id, zoom_start_url")
            .single()

        if (error) {
            console.error("[api/admin/sessions/[id]] PATCH time update error", error)
            return NextResponse.json(
                { error: "Failed to update session after Zoom update", details: error.message },
                { status: 500 }
            )
        }

        await notifyConfirmedBookingsOfSessionChange(
            supabase,
            id,
            "Una sesión en la que estabas inscrito ha sido actualizada (hora o cupo). Revisa el calendario."
        )

        return NextResponse.json(data)
    } catch (err: unknown) {
        console.error("[api/admin/sessions/[id]] PATCH", err)
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: "Internal error", details: message }, { status: 500 })
    }
}

export async function DELETE(_req: Request, context: RouteCtx) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response
        const adminEmail = auth.email

        const { id } = await context.params
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: row, error: fetchErr } = await supabase
            .from("sessions")
            .select("zoom_meeting_id")
            .eq("id", id)
            .maybeSingle()

        if (fetchErr) {
            console.error("[api/admin/sessions/[id]] DELETE fetch", fetchErr)
            return NextResponse.json({ error: "Failed to load session", details: fetchErr.message }, { status: 500 })
        }
        if (!row) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        const zm = typeof (row as { zoom_meeting_id?: unknown }).zoom_meeting_id === "string"
            ? (row as { zoom_meeting_id: string }).zoom_meeting_id
            : null

        try {
            await zoomDeleteIfPresent(zm)
        } catch (e: unknown) {
            if (e instanceof ZoomApiError) {
                return NextResponse.json(
                    { error: "Could not delete Zoom meeting; session was not cancelled", details: e.message },
                    { status: 502 }
                )
            }
            if (e instanceof ZoomConfigError) {
                return NextResponse.json({ error: "Zoom is not configured", details: e.message }, { status: 500 })
            }
            throw e
        }

        const { data, error } = await supabase
            .from("sessions")
            .update({ ...SESSION_CLEAR_CANCEL, last_edited_by_admin_email: adminEmail })
            .eq("id", id)
            .select("id, session_date, session_hour, date, time, capacity, status, link")
            .single()

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Session not found" }, { status: 404 })
            }
            console.error("[api/admin/sessions/[id]] DELETE soft-cancel error", error)
            return NextResponse.json(
                { error: "Failed to cancel session", details: error.message },
                { status: 500 }
            )
        }

        await notifyConfirmedBookingsOfSessionChange(
            supabase,
            id,
            "Una sesión en la que estabas inscrito ha sido cancelada. Revisa «Tus reservas»."
        )

        return NextResponse.json(data)
    } catch (err: unknown) {
        console.error("[api/admin/sessions/[id]] DELETE", err)
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: "Internal error", details: message }, { status: 500 })
    }
}
