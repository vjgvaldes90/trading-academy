import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { isValidGoogleDriveFileId, resolveLessonContentType } from "@/lib/recordedLessons"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
    params: Promise<{ id: string }>
}

type Body = {
    googleDriveFileId?: unknown
}

/**
 * Admin: set or clear the private Google Drive file of a recorded class.
 * Only `google_drive_file_id` can be changed here; tutorials are rejected.
 * Body: { googleDriveFileId: string | null }
 */
export async function PATCH(req: Request, context: RouteContext) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const { id: rawId } = await context.params
        const id = typeof rawId === "string" ? rawId.trim() : ""
        if (!id || !UUID_RE.test(id)) {
            return NextResponse.json({ error: "Invalid lesson id" }, { status: 400 })
        }

        let body: Body
        try {
            body = (await req.json()) as Body
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        if (!("googleDriveFileId" in body)) {
            return NextResponse.json({ error: "googleDriveFileId is required" }, { status: 400 })
        }

        let googleDriveFileId: string | null
        if (body.googleDriveFileId === null) {
            googleDriveFileId = null
        } else if (typeof body.googleDriveFileId === "string") {
            const trimmed = body.googleDriveFileId.trim()
            if (!isValidGoogleDriveFileId(trimmed)) {
                return NextResponse.json(
                    { error: "Invalid Google Drive file ID", code: "invalid_google_drive_file_id" },
                    { status: 400 }
                )
            }
            googleDriveFileId = trimmed
        } else {
            return NextResponse.json(
                { error: "Invalid Google Drive file ID", code: "invalid_google_drive_file_id" },
                { status: 400 }
            )
        }

        const { data: lesson, error: lessonErr } = await supabaseAdmin
            .from("lessons")
            .select("id, content_type")
            .eq("id", id)
            .maybeSingle()

        if (lessonErr) {
            console.error("[api/admin/lessons/id] lookup", lessonErr.message)
            return NextResponse.json({ error: "Failed to load lesson" }, { status: 500 })
        }
        if (!lesson) {
            return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
        }
        if (resolveLessonContentType(lesson.content_type) !== "recorded_class") {
            return NextResponse.json(
                { error: "Only recorded classes can have a Google Drive file", code: "not_recorded_class" },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin
            .from("lessons")
            .update({ google_drive_file_id: googleDriveFileId })
            .eq("id", id)
            .select("id, google_drive_file_id")
            .single()

        if (error) {
            console.error("[api/admin/lessons/id] update", error.message)
            return NextResponse.json(
                { error: "Failed to update lesson", details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (e) {
        console.error("[api/admin/lessons/id] PATCH", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
