import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    buildZoomStartTime,
    createZoomMeeting,
    deleteZoomMeeting,
    extractZoomMeetingIdFromUrl,
    updateZoomMeeting,
    ZoomApiError,
    ZoomConfigError,
} from "@/lib/zoom"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteCtx = { params: Promise<{ id: string }> }

function sessionRowDate(row: Record<string, unknown>): string | null {
    const a = row.date
    return typeof a === "string" && a.trim() !== "" ? a.trim() : null
}

function sessionRowLink(row: Record<string, unknown>): string {
    return typeof row.link === "string" ? row.link.trim() : ""
}

/** Meeting id comes from `sessions.link` (e.g. zoom.us/j/{id}) — not from a DB column. */
function resolveZoomMeetingIdFromLink(row: Record<string, unknown>): string {
    return extractZoomMeetingIdFromUrl(sessionRowLink(row)) ?? ""
}

async function zoomDeleteIfPresent(zoomMeetingId: string | null | undefined): Promise<void> {
    if (typeof zoomMeetingId !== "string" || zoomMeetingId.trim() === "") return
    await deleteZoomMeeting(zoomMeetingId.trim())
}

function defaultMeetingDurationMinutes(): number {
    const raw = process.env.ZOOM_DEFAULT_MEETING_DURATION_MINUTES?.trim()
    if (!raw) return 120
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n <= 0) return 120
    return Math.min(n, 1440)
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

            const rec = row as Record<string, unknown>
            const zm = resolveZoomMeetingIdFromLink(rec)

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

            // Soft-cancel only. `link` is NOT NULL on live schema — do not null it.
            const { data, error } = await supabase
                .from("sessions")
                .update({
                    status: "cancelled",
                    last_edited_by_admin_email: adminEmail,
                })
                .eq("id", id)
                .select("*")
                .single()

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
        let zoomMeetingId = resolveZoomMeetingIdFromLink(rec)

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
                const topic = `Smart Option Academy — ${day} ${timeRaw}`
                zoomUrls = await createZoomMeeting({
                    topic,
                    start_time: startZoom,
                    duration: defaultMeetingDurationMinutes(),
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

        // Source of truth: `link` holds the Zoom join URL. Do not write zoom_* columns.
        const { data, error } = await supabase
            .from("sessions")
            .update({
                time: timeRaw,
                link: zoomUrls.join_url,
                last_edited_by_admin_email: adminEmail,
            })
            .eq("id", id)
            .select("*")
            .single()

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

        const rec = row as Record<string, unknown>
        const zm = resolveZoomMeetingIdFromLink(rec)

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

        // Soft-cancel only. `link` is NOT NULL on live schema — do not null it.
        const { data, error } = await supabase
            .from("sessions")
            .update({
                status: "cancelled",
                last_edited_by_admin_email: adminEmail,
            })
            .eq("id", id)
            .select("*")
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

        return NextResponse.json(data)
    } catch (err: unknown) {
        console.error("[api/admin/sessions/[id]] DELETE", err)
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: "Internal error", details: message }, { status: 500 })
    }
}
