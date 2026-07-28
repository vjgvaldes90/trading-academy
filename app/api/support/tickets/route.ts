import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    SUPPORT_TICKET_CATEGORIES,
    SUPPORT_TICKET_PRIORITIES,
    SUPPORT_TICKET_STATUSES,
    createSupportService,
    createSupportTicketSchema,
} from "@/lib/support"
import { parseCsvOrSingle, supportResultToResponse } from "@/lib/support/http"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const status = parseCsvOrSingle(searchParams.get("status"), SUPPORT_TICKET_STATUSES)
        const priority = parseCsvOrSingle(searchParams.get("priority"), SUPPORT_TICKET_PRIORITIES)
        const category = parseCsvOrSingle(searchParams.get("category"), SUPPORT_TICKET_CATEGORIES)
        const limitRaw = searchParams.get("limit")
        const offsetRaw = searchParams.get("offset")
        const limit = limitRaw ? Number(limitRaw) : 50
        const offset = offsetRaw ? Number(offsetRaw) : 0

        if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
            return NextResponse.json({ ok: false, error: "Invalid limit", code: "validation_error" }, { status: 400 })
        }
        if (!Number.isFinite(offset) || offset < 0) {
            return NextResponse.json({ ok: false, error: "Invalid offset", code: "validation_error" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const service = createSupportService(supabase)
        const result = await service.listTicketsForStudent(email, {
            status,
            priority,
            category,
            limit,
            offset,
        })
        return supportResultToResponse(result)
    } catch (e) {
        console.error("[api/support/tickets] GET", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 })
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ ok: false, error: "Invalid JSON body", code: "validation_error" }, { status: 400 })
        }

        const parsed = createSupportTicketSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                {
                    ok: false,
                    error: parsed.error.issues[0]?.message ?? "Invalid input",
                    code: "validation_error",
                },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const service = createSupportService(supabase)
        const studentIdResult = await service.resolveStudentIdByEmail(email)
        if (!studentIdResult.ok) return supportResultToResponse(studentIdResult)

        const result = await service.createTicket({
            studentId: studentIdResult.data,
            studentEmail: email,
            subject: parsed.data.subject,
            category: parsed.data.category,
            priority: parsed.data.priority,
            body: parsed.data.body,
        })
        return supportResultToResponse(result, 201)
    } catch (e) {
        console.error("[api/support/tickets] POST", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
