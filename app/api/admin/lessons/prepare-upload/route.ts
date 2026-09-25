import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    RECORDED_CLASSES_BUCKET,
    RECORDED_CLASS_MAX_BYTES,
    buildRecordedClassStoragePath,
    formatBytes,
    isAllowedRecordedMime,
} from "@/lib/recordedLessons"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type Body = {
    contentType?: unknown
    fileSize?: unknown
}

/**
 * Admin-only: mint a short-lived signed upload URL for a private Storage object.
 * Browser uploads the file directly to Supabase (not through this route body).
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

        const contentType =
            typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : ""
        const fileSize =
            typeof body.fileSize === "number" && Number.isFinite(body.fileSize)
                ? body.fileSize
                : typeof body.fileSize === "string" && body.fileSize.trim()
                  ? Number(body.fileSize)
                  : NaN

        if (!isAllowedRecordedMime(contentType)) {
            return NextResponse.json(
                {
                    error: "Unsupported video type. Use MP4, WebM, or MOV.",
                    code: "unsupported_type",
                },
                { status: 400 }
            )
        }
        if (!Number.isFinite(fileSize) || fileSize <= 0) {
            return NextResponse.json(
                { error: "fileSize is required", code: "invalid_args" },
                { status: 400 }
            )
        }
        if (fileSize > RECORDED_CLASS_MAX_BYTES) {
            return NextResponse.json(
                {
                    error: `File too large. Maximum is ${formatBytes(RECORDED_CLASS_MAX_BYTES)}.`,
                    code: "file_too_large",
                    max_bytes: RECORDED_CLASS_MAX_BYTES,
                },
                { status: 400 }
            )
        }

        const objectId = randomUUID()
        const path = buildRecordedClassStoragePath(objectId, contentType)

        const { data, error } = await supabaseAdmin.storage
            .from(RECORDED_CLASSES_BUCKET)
            .createSignedUploadUrl(path)

        if (error || !data) {
            console.error(
                "[api/admin/lessons/prepare-upload] createSignedUploadUrl",
                error?.message
            )
            return NextResponse.json(
                {
                    error: "Failed to prepare upload. Ensure the recorded-classes bucket exists.",
                    code: "prepare_failed",
                },
                { status: 503 }
            )
        }

        return NextResponse.json({
            ok: true,
            bucket: RECORDED_CLASSES_BUCKET,
            path: data.path || path,
            token: data.token,
            signedUrl: data.signedUrl,
            max_bytes: RECORDED_CLASS_MAX_BYTES,
        })
    } catch (e) {
        console.error("[api/admin/lessons/prepare-upload] POST", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
