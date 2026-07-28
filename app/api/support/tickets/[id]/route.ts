import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import { createSupportService, supportTicketIdSchema } from "@/lib/support"
import { supportResultToResponse } from "@/lib/support/http"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 })
        }

        const { id } = await context.params
        const ticketId = supportTicketIdSchema.safeParse(id)
        if (!ticketId.success) {
            return NextResponse.json({ ok: false, error: "Invalid ticket id", code: "validation_error" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const service = createSupportService(supabase)
        const result = await service.getTicketForStudent(ticketId.data, email)
        return supportResultToResponse(result)
    } catch (e) {
        console.error("[api/support/tickets/[id]] GET", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
