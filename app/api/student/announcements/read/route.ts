import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    announcementResultToResponse,
    createAnnouncementsService,
    markAnnouncementReadSchema,
} from "@/lib/announcements"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized", code: "unauthorized" },
                { status: 401 }
            )
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { ok: false, error: "Invalid JSON body", code: "validation_error" },
                { status: 400 }
            )
        }

        const parsed = markAnnouncementReadSchema.safeParse(body)
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
        const service = createAnnouncementsService(supabase)
        const studentIdResult = await service.resolveStudentIdByEmail(email)
        if (!studentIdResult.ok) {
            return announcementResultToResponse(studentIdResult)
        }

        const result = await service.markAsRead(
            parsed.data.announcementId,
            studentIdResult.data
        )
        return announcementResultToResponse(result)
    } catch (e) {
        console.error("[api/student/announcements/read] POST", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}
