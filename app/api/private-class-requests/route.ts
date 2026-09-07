import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { emailAcademyAccessEvaluation } from "@/lib/hasPaid"
import {
    PRIVATE_CLASS_CURRENCY,
    PRIVATE_CLASS_DURATION_MINUTES,
    PRIVATE_CLASS_PRICE_CENTS,
    createPrivateClassRequestSchema,
    isPrivateClassSlotInPast,
    normalizeRequestedTime,
    publicPrivateClassRequest,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"

export const runtime = "nodejs"

export async function GET() {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 })
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: student, error: studentErr } = await supabase
            .from("trading_students")
            .select("id, access_code, access_type, is_active, access_expires_at")
            .eq("email", email)
            .maybeSingle()

        if (studentErr) {
            console.error("[api/private-class-requests] GET student lookup", studentErr.message)
            return NextResponse.json({ error: "Failed to resolve student" }, { status: 500 })
        }
        if (!student?.id) {
            return NextResponse.json({ error: "Student not found", code: "not_found" }, { status: 404 })
        }

        const access = await emailAcademyAccessEvaluation(supabase, email)
        if (!access.ok) {
            return NextResponse.json(
                {
                    error: "Academy access required",
                    code: "academy_access_denied",
                    reason: access.reason,
                },
                { status: 403 }
            )
        }

        const { data, error } = await supabase
            .from("private_class_requests")
            .select(
                "id, student_id, student_email, requested_date, requested_time, duration_minutes, price_cents, currency, status, student_message, admin_notes, approved_by_admin_email, rejected_by_admin_email, approved_at, rejected_at, cancelled_at, completed_at, created_at, updated_at"
            )
            .eq("student_id", student.id)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("[api/private-class-requests] GET", error.message)
            return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
        }

        const rows = (data ?? []) as PrivateClassRequestRow[]
        return NextResponse.json({
            requests: rows.map(publicPrivateClassRequest),
        })
    } catch (e) {
        console.error("[api/private-class-requests] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 })
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "Invalid JSON body", code: "validation_error" }, { status: 400 })
        }

        const parsed = createPrivateClassRequestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message ?? "Invalid input",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()

        const { data: student, error: studentErr } = await supabase
            .from("trading_students")
            .select("id, email, access_code, access_type, is_active, access_expires_at")
            .eq("email", email)
            .maybeSingle()

        if (studentErr) {
            console.error("[api/private-class-requests] POST student lookup", studentErr.message)
            return NextResponse.json({ error: "Failed to resolve student" }, { status: 500 })
        }
        if (!student?.id) {
            return NextResponse.json({ error: "Student not found", code: "not_found" }, { status: 404 })
        }

        const access = await emailAcademyAccessEvaluation(supabase, email)
        if (!access.ok) {
            return NextResponse.json(
                {
                    error: "Academy access required to request a private class",
                    code: "academy_access_denied",
                    reason: access.reason,
                },
                { status: 403 }
            )
        }

        const requestedDate = parsed.data.requested_date
        const requestedTime = normalizeRequestedTime(parsed.data.requested_time)

        if (isPrivateClassSlotInPast(requestedDate, requestedTime)) {
            return NextResponse.json(
                {
                    error: "Requested date/time must be in the future (America/New_York)",
                    code: "slot_in_past",
                },
                { status: 400 }
            )
        }

        const messageRaw = parsed.data.student_message
        const studentMessage =
            typeof messageRaw === "string" && messageRaw.trim() !== "" ? messageRaw.trim() : null

        const { data: created, error: insertErr } = await supabase
            .from("private_class_requests")
            .insert({
                student_id: student.id,
                student_email: email,
                requested_date: requestedDate,
                requested_time: requestedTime,
                duration_minutes: PRIVATE_CLASS_DURATION_MINUTES,
                price_cents: PRIVATE_CLASS_PRICE_CENTS,
                currency: PRIVATE_CLASS_CURRENCY,
                status: "pending",
                student_message: studentMessage,
            })
            .select(
                "id, student_id, student_email, requested_date, requested_time, duration_minutes, price_cents, currency, status, student_message, admin_notes, approved_by_admin_email, rejected_by_admin_email, approved_at, rejected_at, cancelled_at, completed_at, created_at, updated_at"
            )
            .single()

        if (insertErr || !created) {
            console.error("[api/private-class-requests] POST insert", insertErr?.message)
            return NextResponse.json({ error: "Failed to create request" }, { status: 500 })
        }

        return NextResponse.json(
            { request: publicPrivateClassRequest(created as PrivateClassRequestRow) },
            { status: 201 }
        )
    } catch (e) {
        console.error("[api/private-class-requests] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
