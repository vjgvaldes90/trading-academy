import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    SUPPORT_TICKET_CATEGORIES,
    SUPPORT_TICKET_PRIORITIES,
    SUPPORT_TICKET_STATUSES,
    createSupportService,
} from "@/lib/support"
import { parseCsvOrSingle, supportResultToResponse } from "@/lib/support/http"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { searchParams } = new URL(req.url)
        const status = parseCsvOrSingle(searchParams.get("status"), SUPPORT_TICKET_STATUSES)
        const priority = parseCsvOrSingle(searchParams.get("priority"), SUPPORT_TICKET_PRIORITIES)
        const category = parseCsvOrSingle(searchParams.get("category"), SUPPORT_TICKET_CATEGORIES)
        const assignedAdminEmail = searchParams.get("assigned_admin_email")?.trim() || undefined
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
        const result = await service.listTicketsForAdmin({
            status,
            priority,
            category,
            assignedAdminEmail,
            limit,
            offset,
        })
        return supportResultToResponse(result)
    } catch (e) {
        console.error("[api/support/admin/tickets] GET", e)
        return NextResponse.json({ ok: false, error: "Internal error", code: "internal_error" }, { status: 500 })
    }
}
