import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    announcementResultToResponse,
    createAnnouncementsService,
} from "@/lib/announcements"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"

export const runtime = "nodejs"

export async function GET() {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized", code: "unauthorized" },
                { status: 401 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const service = createAnnouncementsService(supabase)
        const studentIdResult = await service.resolveStudentIdByEmail(email)
        if (!studentIdResult.ok) {
            return announcementResultToResponse(studentIdResult)
        }

        const result = await service.listForStudent(studentIdResult.data, {
            limit: 100,
            offset: 0,
        })
        return announcementResultToResponse(result)
    } catch (e) {
        console.error("[api/student/announcements] GET", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}
