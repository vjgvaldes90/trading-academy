import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    announcementIdSchema,
    createAnnouncementsService,
    updateAnnouncementSchema,
} from "@/lib/announcements"
import { announcementResultToResponse } from "@/lib/announcements/http"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id } = await context.params
        const announcementId = announcementIdSchema.safeParse(id)
        if (!announcementId.success) {
            return NextResponse.json(
                { ok: false, error: "Invalid announcement id", code: "validation_error" },
                { status: 400 }
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

        const parsed = updateAnnouncementSchema.safeParse(body)
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
        const result = await service.updateAnnouncement({
            id: announcementId.data,
            title: parsed.data.title,
            message: parsed.data.message,
            priority: parsed.data.priority,
            published: parsed.data.published,
        })
        return announcementResultToResponse(result)
    } catch (e) {
        console.error("[api/admin/announcements/[id]] PATCH", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}

export async function DELETE(_req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id } = await context.params
        const announcementId = announcementIdSchema.safeParse(id)
        if (!announcementId.success) {
            return NextResponse.json(
                { ok: false, error: "Invalid announcement id", code: "validation_error" },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const service = createAnnouncementsService(supabase)
        const result = await service.deleteAnnouncement(announcementId.data)
        return announcementResultToResponse(result)
    } catch (e) {
        console.error("[api/admin/announcements/[id]] DELETE", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}
