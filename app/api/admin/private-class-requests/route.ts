import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    PRIVATE_CLASS_CURRENCY,
    PRIVATE_CLASS_DURATION_MINUTES,
    PRIVATE_CLASS_FREE_PAYMENT_STATUS,
    PRIVATE_CLASS_FREE_PRICE_CENTS,
    PRIVATE_CLASS_REQUEST_SELECT,
    PRIVATE_CLASS_STATUSES,
    adminPrivateClassRequest,
    createFreePrivateClassSchema,
    isPrivateClassSlotInPast,
    isPrivateClassStatus,
    normalizeRequestedTime,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"
import { ensurePrivateClassZoomMeeting } from "@/lib/privateClassZoom"
import { ZoomApiError, ZoomConfigError } from "@/lib/zoom"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { searchParams } = new URL(req.url)
        const statusRaw = searchParams.get("status")?.trim().toLowerCase() ?? ""

        const supabase = createSupabaseServiceRoleClient()
        let query = supabase
            .from("private_class_requests")
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .order("created_at", { ascending: false })

        if (statusRaw) {
            if (!isPrivateClassStatus(statusRaw)) {
                return NextResponse.json(
                    {
                        error: `Invalid status. Allowed: ${PRIVATE_CLASS_STATUSES.join(", ")}`,
                        code: "validation_error",
                    },
                    { status: 400 }
                )
            }
            query = query.eq("status", statusRaw)
        }

        const { data, error } = await query
        if (error) {
            console.error("[api/admin/private-class-requests] GET", error.message)
            return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
        }

        const rows = (data ?? []) as PrivateClassRequestRow[]
        return NextResponse.json({
            requests: rows.map(adminPrivateClassRequest),
        })
    } catch (e) {
        console.error("[api/admin/private-class-requests] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

/**
 * Admin: create a complimentary Private Class (price 0, no Stripe).
 * Inserts as `paid` then ensures Zoom → typically `confirmed`.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body", code: "validation_error" },
                { status: 400 }
            )
        }

        const parsed = createFreePrivateClassSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message ?? "Invalid input",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }

        const studentId = parsed.data.student_id
        const requestedDate = parsed.data.requested_date
        const requestedTime = normalizeRequestedTime(parsed.data.requested_time)
        const notesRaw = parsed.data.admin_notes
        const adminNotes =
            typeof notesRaw === "string" && notesRaw.trim() !== ""
                ? notesRaw.trim()
                : "Admin-created free private class"

        if (isPrivateClassSlotInPast(requestedDate, requestedTime)) {
            return NextResponse.json(
                {
                    error: "Requested date/time must be in the future (America/New_York)",
                    code: "slot_in_past",
                },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: student, error: studentErr } = await supabase
            .from("trading_students")
            .select("id, email")
            .eq("id", studentId)
            .maybeSingle()

        if (studentErr) {
            console.error("[api/admin/private-class-requests] POST student", studentErr.message)
            return NextResponse.json({ error: "Failed to load student" }, { status: 500 })
        }
        if (!student || typeof student.email !== "string" || !student.email.trim()) {
            return NextResponse.json(
                { error: "Student not found", code: "not_found" },
                { status: 404 }
            )
        }

        const studentEmail = student.email.trim().toLowerCase()
        const nowIso = new Date().toISOString()

        const { data: created, error: insertErr } = await supabase
            .from("private_class_requests")
            .insert({
                student_id: student.id,
                student_email: studentEmail,
                requested_date: requestedDate,
                requested_time: requestedTime,
                duration_minutes: PRIVATE_CLASS_DURATION_MINUTES,
                price_cents: PRIVATE_CLASS_FREE_PRICE_CENTS,
                currency: PRIVATE_CLASS_CURRENCY,
                status: "paid",
                student_message: null,
                admin_notes: adminNotes,
                approved_by_admin_email: auth.email,
                approved_at: nowIso,
                stripe_checkout_session_id: null,
                stripe_payment_intent_id: null,
                stripe_payment_status: PRIVATE_CLASS_FREE_PAYMENT_STATUS,
                paid_at: nowIso,
            })
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .single()

        if (insertErr || !created) {
            console.error("[api/admin/private-class-requests] POST insert", insertErr?.message)
            return NextResponse.json(
                { error: "Failed to create free private class", code: "db_insert_failed" },
                { status: 500 }
            )
        }

        const requestId = String((created as PrivateClassRequestRow).id)
        let zoomWarning: string | null = null

        try {
            await ensurePrivateClassZoomMeeting({ supabase, requestId })
        } catch (zoomErr) {
            console.error("[api/admin/private-class-requests] POST zoom ensure failed", zoomErr)
            if (zoomErr instanceof ZoomConfigError) {
                zoomWarning = "zoom_not_configured"
            } else if (zoomErr instanceof ZoomApiError) {
                zoomWarning = "zoom_api_failed"
            } else {
                zoomWarning = "zoom_ensure_failed"
            }
        }

        const { data: fresh, error: reloadErr } = await supabase
            .from("private_class_requests")
            .select(PRIVATE_CLASS_REQUEST_SELECT)
            .eq("id", requestId)
            .maybeSingle()

        if (reloadErr) {
            console.error("[api/admin/private-class-requests] POST reload", reloadErr.message)
        }

        const row = (fresh ?? created) as PrivateClassRequestRow
        return NextResponse.json(
            {
                ok: true,
                request: adminPrivateClassRequest(row),
                zoom_warning: zoomWarning,
            },
            { status: 201 }
        )
    } catch (e) {
        console.error("[api/admin/private-class-requests] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
