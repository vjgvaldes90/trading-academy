import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    addSupportMessageSchema,
    createSupportService,
    supportTicketIdSchema,
} from "@/lib/support"
import { supportResultToResponse } from "@/lib/support/http"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
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

        const parsed = addSupportMessageSchema.safeParse(body)
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
        const result = await service.addAdminMessage({
            ticketId: ticketId.data,
            senderType: "admin",
            senderEmail: auth.email,
            adminEmail: auth.email,
            body: parsed.data.body,
            isInternal: parsed.data.isInternal,
            nextStatus: parsed.data.nextStatus,
        })
        return supportResultToResponse(result, 201)
    } catch (e) {
        console.error("[api/support/admin/tickets/[id]/messages] POST", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
