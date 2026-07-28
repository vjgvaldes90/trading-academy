import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    createSupportService,
    supportTicketIdSchema,
    updateSupportTicketSchema,
} from "@/lib/support"
import { supportResultToResponse } from "@/lib/support/http"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id } = await context.params
        const ticketId = supportTicketIdSchema.safeParse(id)
        if (!ticketId.success) {
            return NextResponse.json({ ok: false, error: "Invalid ticket id", code: "validation_error" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const service = createSupportService(supabase)
        const result = await service.getTicketForAdmin(ticketId.data)
        return supportResultToResponse(result)
    } catch (e) {
        console.error("[api/support/admin/tickets/[id]] GET", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}

export async function PATCH(req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id } = await context.params
        const ticketId = supportTicketIdSchema.safeParse(id)
        if (!ticketId.success) {
            return NextResponse.json({ ok: false, error: "Invalid ticket id", code: "validation_error" }, { status: 400 })
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ ok: false, error: "Invalid JSON body", code: "validation_error" }, { status: 400 })
        }

        const parsed = updateSupportTicketSchema.safeParse(body)
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
        const result = await service.updateTicketAsAdmin({
            ticketId: ticketId.data,
            status: parsed.data.status,
            priority: parsed.data.priority,
            category: parsed.data.category,
            assignedAdminEmail: parsed.data.assignedAdminEmail,
        })
        return supportResultToResponse(result)
    } catch (e) {
        console.error("[api/support/admin/tickets/[id]] PATCH", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
