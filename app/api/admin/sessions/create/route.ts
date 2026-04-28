import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { DEFAULT_MEET_LINK } from "@/lib/defaultMeetLink"

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

export async function POST(req: Request) {
    try {
        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const b = body as Record<string, unknown>
        const dateRaw = typeof b.date === "string" ? b.date.trim() : ""
        const timeRaw = typeof b.time === "string" ? b.time.trim() : ""
        const linkFromBody = typeof b.link === "string" ? b.link.trim() : ""
        const parsedCapacity = parseCapacity(b.capacity)

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

        const resolvedLink = linkFromBody !== "" ? linkFromBody : DEFAULT_MEET_LINK

        const date = dateRaw
        const time = timeRaw
        const link = resolvedLink
        const capacity: number =
            typeof parsedCapacity === "number" &&
            Number.isFinite(parsedCapacity) &&
            Number.isInteger(parsedCapacity) &&
            parsedCapacity > 0
                ? parsedCapacity
                : 10

        console.log("SESSION INSERT FIXED:", {
            date,
            time,
            capacity,
            link,
        })

        const supabase = createSupabaseServiceRoleClient()

        const { data, error } = await supabase
            .from("sessions")
            .insert({
                date,
                time,
                capacity,
                booked_slots: 0,
                status: "active",
                link,
            })
            .select("id, day, date, time, max_slots, booked_slots, link, created_at, capacity, status")
            .single()

        if (error) {
            console.error("[api/admin/sessions/create] insert error", error)
            return NextResponse.json(
                { error: "Failed to create session", details: error.message },
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
