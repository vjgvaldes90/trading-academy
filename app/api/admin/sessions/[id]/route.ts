import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    buildZoomStartTime,
    createZoomMeeting,
    deleteZoomMeeting,
    updateZoomMeeting,
    ZoomApiError,
    ZoomConfigError,
} from "@/lib/zoom"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteCtx = { params: Promise<{ id: string }> }
type ServiceClient = ReturnType<typeof createSupabaseServiceRoleClient>

function sessionRowDate(row: Record<string, unknown>): string | null {
    const a = row.session_date ?? row.date
    return typeof a === "string" && a.trim() !== "" ? a.trim() : null
}

function sessionRowZoomMeetingId(row: Record<string, unknown>): string {
    const raw = row.zoom_meeting_id
    if (typeof raw === "string" && raw.trim() !== "") return raw.trim()
    if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)
    return ""
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

/** Only write time onto columns that exist on the loaded row (legacy `time` vs `session_hour`). */
function buildTimeUpdateFields(existing: Record<string, unknown>, timeRaw: string): Record<string, unknown> {
    const hasSessionHour = Object.prototype.hasOwnProperty.call(existing, "session_hour")
    const hasTime = Object.prototype.hasOwnProperty.call(existing, "time")
    if (hasSessionHour && hasTime) return { session_hour: timeRaw, time: timeRaw }
    if (hasSessionHour) return { session_hour: timeRaw }
    if (hasTime) return { time: timeRaw }
    // Fallback: try canonical name first; applySessionUpdate retries the other.
    return { session_hour: timeRaw }
}

async function applySessionUpdate(supabase: ServiceClient, id: string, patch: Record<string, unknown>) {
    const primary = await supabase.from("sessions").update(patch).eq("id", id).select("*").single()
    if (!primary.error) return primary

    const timeVal =
        typeof patch.session_hour === "string"
            ? patch.session_hour
            : typeof patch.time === "string"
              ? patch.time
              : undefined

    const {
        session_hour: _sh,
        time: _t,
        date: _d,
        session_date: _sd,
        day: _day,
        session_day: _sday,
        ...rest
    } = patch

    const attempts: Record<string, unknown>[] = []
    if (typeof timeVal === "string") {
        attempts.push({ ...rest, session_hour: timeVal })
        attempts.push({ ...rest, time: timeVal })
    } else {
        attempts.push(rest)
    }

    let last = primary
    for (const attempt of attempts) {
        const res = await supabase.from("sessions").update(attempt).eq("id", id).select("*").single()
        if (!res.error) return res
        last = res
    }
    return last
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
        const hasStatus = Object.prototype.hasOwnProperty.call(b, "status")

        if (!hasTime && !hasStatus) {
            return NextResponse.json(
                { error: "Provide at least one of: time, status" },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()

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
                .select("*")
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

            const zm = sessionRowZoomMeetingId(row as Record<string, unknown>)

            try {
                await zoomDeleteIfPresent(zm || null)
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

            const { data, error } = await applySessionUpdate(supabase, id, {
                ...SESSION_CLEAR_CANCEL,
                last_edited_by_admin_email: adminEmail,
            })

            if (error) {
                console.error("[api/admin/sessions/[id]] PATCH soft-cancel update error", error)
                return NextResponse.json(
                    { error: "Failed to cancel session after Zoom delete", details: error.message },
                    { status: 500 }
                )
            }

            return NextResponse.json(data)
        }

        const timeRaw = typeof b.time === "string" ? b.time.trim() : ""
        if (!timeRaw) {
            return NextResponse.json({ error: "time must be a non-empty string" }, { status: 400 })
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
        let zoomMeetingId = sessionRowZoomMeetingId(rec)

        if (!day) {
            return NextResponse.json(
                { error: "Session is missing calendar date in database; fix the row before rescheduling" },
                { status: 400 }
            )
        }

        let startZoom: string
        try {
            startZoom = buildZoomStartTime(day, timeRaw)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Invalid time"
            return NextResponse.json({ error: "Invalid session time", details: msg }, { status: 400 })
        }

        let zoomUrls: {
            join_url: string
            start_url: string
            password: string
            meeting_id: string
        }

        try {
            if (zoomMeetingId) {
                zoomUrls = await updateZoomMeeting(zoomMeetingId, { start_time: startZoom })
            } else {
                // Self-heal rows created when Zoom meeting ids were not persisted.
                const topic =
                    typeof rec.title === "string" && rec.title.trim()
                        ? rec.title.trim()
                        : `Smart Option Academy — ${day} ${timeRaw}`
                const durationEnv = process.env.ZOOM_DEFAULT_MEETING_DURATION_MINUTES?.trim()
                const durationParsed = durationEnv ? Number.parseInt(durationEnv, 10) : NaN
                const duration =
                    Number.isFinite(durationParsed) && durationParsed > 0
                        ? Math.min(durationParsed, 1440)
                        : 120
                zoomUrls = await createZoomMeeting({
                    topic,
                    start_time: startZoom,
                    duration,
                })
                zoomMeetingId = zoomUrls.meeting_id
            }
        } catch (e: unknown) {
            if (e instanceof ZoomApiError) {
                return NextResponse.json(
                    {
                        error: zoomMeetingId
                            ? "Could not update Zoom meeting; session hours were not saved"
                            : "Could not create Zoom meeting for this session; session hours were not saved",
                        details: e.message,
                    },
                    { status: 502 }
                )
            }
            if (e instanceof ZoomConfigError) {
                return NextResponse.json({ error: "Zoom is not configured", details: e.message }, { status: 500 })
            }
            throw e
        }

        const { data, error } = await applySessionUpdate(supabase, id, {
            ...buildTimeUpdateFields(rec, timeRaw),
            last_edited_by_admin_email: adminEmail,
            link: zoomUrls.join_url,
            zoom_meeting_id: zoomUrls.meeting_id,
            zoom_start_url: zoomUrls.start_url,
            zoom_password: zoomUrls.password || null,
        })

        if (error) {
            console.error("[api/admin/sessions/[id]] PATCH time update error", error)
            return NextResponse.json(
                { error: "Failed to update session after Zoom update", details: error.message },
                { status: 500 }
            )
        }

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
            .select("*")
            .eq("id", id)
            .maybeSingle()

        if (fetchErr) {
            console.error("[api/admin/sessions/[id]] DELETE fetch", fetchErr)
            return NextResponse.json({ error: "Failed to load session", details: fetchErr.message }, { status: 500 })
        }
        if (!row) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        const zm = sessionRowZoomMeetingId(row as Record<string, unknown>)

        try {
            await zoomDeleteIfPresent(zm || null)
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

        const { data, error } = await applySessionUpdate(supabase, id, {
            ...SESSION_CLEAR_CANCEL,
            last_edited_by_admin_email: adminEmail,
        })

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

        return NextResponse.json(data)
    } catch (err: unknown) {
        console.error("[api/admin/sessions/[id]] DELETE", err)
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: "Internal error", details: message }, { status: 500 })
    }
}
