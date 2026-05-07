import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { spanishWeekdayFromIsoDate } from "@/lib/sessions"
import {
    buildZoomStartTime,
    createZoomMeeting,
    deleteZoomMeeting,
    ZoomApiError,
    ZoomConfigError,
} from "@/lib/zoom"

export const runtime = "nodejs"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

function parseDurationMinutes(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0) {
        return Math.min(value, 1440)
    }
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number.parseInt(value.trim(), 10)
        if (Number.isFinite(n) && n > 0) return Math.min(n, 1440)
    }
    return null
}

function defaultMeetingDurationMinutes(): number {
    const raw = process.env.ZOOM_DEFAULT_MEETING_DURATION_MINUTES?.trim()
    if (!raw) return 120
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n <= 0) return 120
    return Math.min(n, 1440)
}

/** Zoom meetings: S2S OAuth only (`ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` in `@/lib/zoom`). */
export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response
        const adminEmail = auth.email

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const b = body as Record<string, unknown>
        const dateRaw = typeof b.date === "string" ? b.date.trim() : ""
        const timeRaw = typeof b.time === "string" ? b.time.trim() : ""
        const parsedCapacity = parseCapacity(b.capacity)
        const parsedDuration = parseDurationMinutes(b.duration ?? b.duration_minutes)

        if (!dateRaw || !timeRaw) {
            return NextResponse.json(
                { error: "Missing or invalid fields: date and time are required" },
                { status: 400 }
            )
        }

        if (!DATE_RE.test(dateRaw)) {
            return NextResponse.json(
                { error: "date must be a YYYY-MM-DD string" },
                { status: 400 }
            )
        }

        const capacity: number =
            typeof parsedCapacity === "number" &&
            Number.isFinite(parsedCapacity) &&
            Number.isInteger(parsedCapacity) &&
            parsedCapacity > 0
                ? parsedCapacity
                : 10

        const duration = parsedDuration ?? defaultMeetingDurationMinutes()

        let startTimeZoom: string
        try {
            startTimeZoom = buildZoomStartTime(dateRaw, timeRaw)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Invalid date/time"
            return NextResponse.json({ error: "Invalid session date or time", details: msg }, { status: 400 })
        }

        const topic =
            typeof b.topic === "string" && b.topic.trim() !== ""
                ? b.topic.trim()
                : `Smart Option Academy — ${dateRaw} ${timeRaw}`

        let zoom: Awaited<ReturnType<typeof createZoomMeeting>>
        try {
            zoom = await createZoomMeeting({
                topic,
                start_time: startTimeZoom,
                duration,
            })
        } catch (e: unknown) {
            if (e instanceof ZoomConfigError) {
                return NextResponse.json(
                    { error: "Zoom is not configured for this server", details: e.message },
                    { status: 500 }
                )
            }
            if (e instanceof ZoomApiError) {
                return NextResponse.json(
                    { error: "Could not create Zoom meeting; session was not saved", details: e.message },
                    { status: 502 }
                )
            }
            throw e
        }

        const supabase = createSupabaseServiceRoleClient()

        const day = spanishWeekdayFromIsoDate(dateRaw)
        const insertRow = {
            day,
            date: dateRaw,
            time: timeRaw,
            capacity,
            max_slots: capacity,
            booked_slots: 0,
            link: zoom.join_url,
            status: "active" as const,
            created_by_admin_email: adminEmail,
            last_edited_by_admin_email: adminEmail,
        }

        const { data, error } = await supabase.from("sessions").insert(insertRow).select("*").single()

        if (error) {
            console.error("[api/admin/sessions/create] insert error", error)
            try {
                await deleteZoomMeeting(zoom.meeting_id)
            } catch (rollbackErr: unknown) {
                console.error("[api/admin/sessions/create] zoom rollback delete failed", rollbackErr)
            }
            return NextResponse.json(
                { error: "Failed to create session after Zoom meeting was created", details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(data, { status: 201 })
    } catch (err: unknown) {
        console.error("[api/admin/sessions/create] POST", err)
        const message = err instanceof Error ? err.message : "Unknown error"
        return NextResponse.json({ error: "Internal error", details: message }, { status: 500 })
    }
}
