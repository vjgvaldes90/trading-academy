import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    ANNOUNCEMENT_PRIORITIES,
    createAnnouncementSchema,
    createAnnouncementsService,
} from "@/lib/announcements"
import { announcementResultToResponse, parseCsvOrSingle } from "@/lib/announcements/http"

export const runtime = "nodejs"

export async function GET(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { searchParams } = new URL(req.url)
        const priority = parseCsvOrSingle(searchParams.get("priority"), ANNOUNCEMENT_PRIORITIES)
        const publishedRaw = searchParams.get("published")
        const published =
            publishedRaw === null || publishedRaw === ""
                ? undefined
                : publishedRaw === "true"
                  ? true
                  : publishedRaw === "false"
                    ? false
                    : undefined
        if (publishedRaw && published === undefined) {
            return NextResponse.json(
                { ok: false, error: "Invalid published", code: "validation_error" },
                { status: 400 }
            )
        }

        const limitRaw = searchParams.get("limit")
        const offsetRaw = searchParams.get("offset")
        const limit = limitRaw ? Number(limitRaw) : 50
        const offset = offsetRaw ? Number(offsetRaw) : 0

        if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
            return NextResponse.json(
                { ok: false, error: "Invalid limit", code: "validation_error" },
                { status: 400 }
            )
        }
        if (!Number.isFinite(offset) || offset < 0) {
            return NextResponse.json(
                { ok: false, error: "Invalid offset", code: "validation_error" },
                { status: 400 }
            )
        }

        const supabase = createSupabaseServiceRoleClient()
        const service = createAnnouncementsService(supabase)
        const result = await service.getAnnouncements({
            priority,
            published,
            limit,
            offset,
        })
        return announcementResultToResponse(result)
    } catch (e) {
        console.error("[api/admin/announcements] GET", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { ok: false, error: "Invalid JSON body", code: "validation_error" },
                { status: 400 }
            )
        }

        const parsed = createAnnouncementSchema.safeParse(body)
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
        const result = await service.createAnnouncement({
            title: parsed.data.title,
            message: parsed.data.message,
            priority: parsed.data.priority,
            published: parsed.data.published,
            createdBy: parsed.data.createdBy ?? null,
        })
        return announcementResultToResponse(result, 201)
    } catch (e) {
        console.error("[api/admin/announcements] POST", e)
        return NextResponse.json(
            { ok: false, error: "Internal error", code: "internal_error" },
            { status: 500 }
        )
    }
}
