import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { notifyConfirmedBookingsOfSessionChange } from "@/lib/notifySessionBookingStudents"

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

export async function PATCH(req: Request, context: RouteCtx) {
    try {
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

        const patch: { time?: string; capacity?: number; status?: string } = {}

        if (hasStatus) {
            const raw = b.status
            const s = typeof raw === "string" ? raw.trim().toLowerCase() : ""
            if (s !== "cancelled") {
                return NextResponse.json(
                    { error: 'When provided, status must be "cancelled" (soft cancel)' },
                    { status: 400 }
                )
            }
            patch.status = "cancelled"
        }

        if (hasTime) {
            const timeRaw = typeof b.time === "string" ? b.time.trim() : ""
            if (!timeRaw) {
                return NextResponse.json({ error: "time must be a non-empty string" }, { status: 400 })
            }
            patch.time = timeRaw
        }

        if (hasCapacity) {
            const cap = parseCapacity(b.capacity)
            if (cap === null) {
                return NextResponse.json({ error: "capacity must be an integer" }, { status: 400 })
            }
            if (cap < 0) {
                return NextResponse.json({ error: "capacity must be non-negative" }, { status: 400 })
            }
            patch.capacity = cap
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data, error } = await supabase
            .from("sessions")
            .update(patch)
            .eq("id", id)
            .select("id, date, time, capacity, status")
            .single()

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "Session not found" }, { status: 404 })
            }
            console.error("[api/admin/sessions/[id]] PATCH update error", error)
            return NextResponse.json(
                { error: "Failed to update session", details: error.message },
                { status: 500 }
            )
        }

        const notifyCancel = patch.status === "cancelled"
        const notifyUpdate =
            !notifyCancel && (patch.time !== undefined || patch.capacity !== undefined)
        if (notifyCancel) {
            await notifyConfirmedBookingsOfSessionChange(
                supabase,
                id,
                "Una sesión en la que estabas inscrito ha sido cancelada. Revisa «Tus reservas»."
            )
        } else if (notifyUpdate) {
            await notifyConfirmedBookingsOfSessionChange(
                supabase,
                id,
                "Una sesión en la que estabas inscrito ha sido actualizada (hora o cupo). Revisa el calendario."
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
        const { id } = await context.params
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data, error } = await supabase
            .from("sessions")
            .update({ status: "cancelled" })
            .eq("id", id)
            .select("id, date, time, capacity, status")
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
