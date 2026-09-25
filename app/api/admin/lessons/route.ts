import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    RECORDED_CLASSES_BUCKET,
    isLessonClassType,
    isLessonSourceType,
    isValidRecordedClassStoragePath,
} from "@/lib/recordedLessons"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type Body = {
    title?: unknown
    description?: unknown
    videoUrl?: unknown
    sourceType?: unknown
    storagePath?: unknown
    classDate?: unknown
    classType?: unknown
}

function trimString(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

async function removeUploadedObject(path: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(RECORDED_CLASSES_BUCKET).remove([path])
    if (error) {
        console.error("[api/admin/lessons] cleanup remove failed", path, error.message)
    }
}

/**
 * Admin create lesson metadata.
 * - YouTube: { title, description?, videoUrl, classDate?, classType? }
 * - Upload:  { title, description?, sourceType: "upload", storagePath, classDate?, classType? }
 * Does not accept multipart video bodies.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        let body: Body
        try {
            body = (await req.json()) as Body
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
        }

        const title = trimString(body.title)
        if (!title) {
            return NextResponse.json({ error: "title is required" }, { status: 400 })
        }

        const descriptionRaw = typeof body.description === "string" ? body.description.trim() : ""
        const description = descriptionRaw.length > 0 ? descriptionRaw : null

        const sourceTypeRaw = body.sourceType
        const sourceType = isLessonSourceType(sourceTypeRaw)
            ? sourceTypeRaw
            : body.storagePath
              ? "upload"
              : "youtube"

        let classType: string | null = null
        if (body.classType !== undefined && body.classType !== null && body.classType !== "") {
            if (!isLessonClassType(body.classType)) {
                return NextResponse.json(
                    { error: 'classType must be "trading" or "theory"' },
                    { status: 400 }
                )
            }
            classType = body.classType
        }

        let classDate: string | null = null
        if (body.classDate !== undefined && body.classDate !== null && body.classDate !== "") {
            const raw = trimString(body.classDate)
            const ms = Date.parse(raw)
            if (!Number.isFinite(ms)) {
                return NextResponse.json({ error: "classDate is invalid" }, { status: 400 })
            }
            classDate = new Date(ms).toISOString()
        }

        if (sourceType === "youtube") {
            const videoUrl = trimString(body.videoUrl)
            if (!videoUrl) {
                return NextResponse.json({ error: "videoUrl is required" }, { status: 400 })
            }

            const { data, error } = await supabaseAdmin
                .from("lessons")
                .insert([
                    {
                        title,
                        description,
                        video_url: videoUrl,
                        source_type: "youtube",
                        storage_path: null,
                        class_date: classDate,
                        class_type: classType,
                        is_published: true,
                    },
                ])
                .select(
                    "id, title, description, video_url, source_type, storage_path, class_date, class_type, is_published, created_at"
                )
                .single()

            if (error) {
                console.error("[api/admin/lessons] insert youtube", error.message)
                return NextResponse.json(
                    { error: "Failed to create lesson", details: error.message },
                    { status: 500 }
                )
            }

            return NextResponse.json(data, { status: 201 })
        }

        // --- upload source ---
        const storagePath = trimString(body.storagePath)
        if (!storagePath || !isValidRecordedClassStoragePath(storagePath)) {
            return NextResponse.json(
                { error: "storagePath is missing or invalid", code: "invalid_storage_path" },
                { status: 400 }
            )
        }

        // Ensure object exists before inserting metadata.
        const { data: listed, error: listErr } = await supabaseAdmin.storage
            .from(RECORDED_CLASSES_BUCKET)
            .list(storagePath.split("/").slice(0, -1).join("/"), {
                search: storagePath.split("/").pop(),
                limit: 5,
            })

        if (listErr) {
            console.error("[api/admin/lessons] storage list", listErr.message)
            return NextResponse.json(
                { error: "Failed to verify uploaded file", code: "verify_failed" },
                { status: 500 }
            )
        }

        const fileName = storagePath.split("/").pop() ?? ""
        const found = Array.isArray(listed) && listed.some((f) => f.name === fileName)
        if (!found) {
            return NextResponse.json(
                {
                    error: "Uploaded file not found in storage. Upload again.",
                    code: "object_missing",
                },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin
            .from("lessons")
            .insert([
                {
                    title,
                    description,
                    video_url: null,
                    source_type: "upload",
                    storage_path: storagePath,
                    class_date: classDate,
                    class_type: classType,
                    is_published: true,
                },
            ])
            .select(
                "id, title, description, video_url, source_type, storage_path, class_date, class_type, is_published, created_at"
            )
            .single()

        if (error) {
            console.error("[api/admin/lessons] insert upload", error.message)
            await removeUploadedObject(storagePath)
            return NextResponse.json(
                { error: "Failed to create lesson", details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(data, { status: 201 })
    } catch (e) {
        console.error("[api/admin/lessons] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
