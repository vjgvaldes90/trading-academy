import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    PRIVATE_CLASS_REQUEST_SELECT,
    PRIVATE_CLASS_STATUSES,
    isPrivateClassStatus,
    publicPrivateClassRequest,
    type PrivateClassRequestRow,
} from "@/lib/privateClassRequests"

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
            requests: rows.map(publicPrivateClassRequest),
        })
    } catch (e) {
        console.error("[api/admin/private-class-requests] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
