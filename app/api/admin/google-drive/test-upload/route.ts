import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import {
    GOOGLE_DRIVE_SCOPE,
    GOOGLE_DRIVE_TEST_UPLOAD_MAX_BYTES,
    GoogleDriveApiError,
    GoogleDriveConfigError,
    getGoogleDriveAccessToken,
    getSharedDriveFolder,
    isGoogleWifConfigured,
    uploadSmallFileToSharedDrive,
} from "@/lib/googleDrive"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** ISO BMFF (MP4) files carry the `ftyp` box type at bytes 4..7. */
function looksLikeMp4(bytes: Uint8Array): boolean {
    return (
        bytes.byteLength >= 12 &&
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70
    )
}

/**
 * Temporary admin-only Drive write test: uploads a small MP4 to the Trading folder
 * of the configured Shared Drive. Returns file metadata only — never tokens.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        if (!isGoogleWifConfigured()) {
            return NextResponse.json(
                { success: false, stage: "config", error: "Google Workload Identity Federation env is incomplete" },
                { status: 503 }
            )
        }

        const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim() || ""
        if (!sharedDriveId) {
            return NextResponse.json(
                { success: false, stage: "config", error: "GOOGLE_SHARED_DRIVE_ID is not set" },
                { status: 503 }
            )
        }

        const folderId = process.env.GOOGLE_DRIVE_TRADING_FOLDER_ID?.trim() || ""
        if (!folderId) {
            return NextResponse.json(
                { success: false, stage: "config", error: "GOOGLE_DRIVE_TRADING_FOLDER_ID is not set" },
                { status: 503 }
            )
        }

        let form: FormData
        try {
            form = await req.formData()
        } catch {
            return NextResponse.json(
                { success: false, stage: "validation", error: "Expected multipart/form-data" },
                { status: 400 }
            )
        }

        const file = form.get("file")
        if (!(file instanceof File)) {
            return NextResponse.json(
                { success: false, stage: "validation", error: "file is required" },
                { status: 400 }
            )
        }
        if (file.size <= 0 || file.size > GOOGLE_DRIVE_TEST_UPLOAD_MAX_BYTES) {
            return NextResponse.json(
                { success: false, stage: "validation", error: "File must be between 1 byte and 4 MB" },
                { status: 400 }
            )
        }
        if (file.type !== "video/mp4") {
            return NextResponse.json(
                { success: false, stage: "validation", error: "Only video/mp4 is accepted" },
                { status: 400 }
            )
        }

        const data = new Uint8Array(await file.arrayBuffer())
        if (!looksLikeMp4(data)) {
            return NextResponse.json(
                { success: false, stage: "validation", error: "File does not look like an MP4 (missing ftyp header)" },
                { status: 400 }
            )
        }

        await getGoogleDriveAccessToken(req.headers, GOOGLE_DRIVE_SCOPE)
        const folder = await getSharedDriveFolder(folderId, sharedDriveId, req.headers)

        const name = `test-upload-${new Date().toISOString().replace(/[:.]/g, "-")}.mp4`
        const uploaded = await uploadSmallFileToSharedDrive({
            sharedDriveId,
            folderId: folder.id,
            name,
            mimeType: "video/mp4",
            data,
            headers: req.headers,
        })

        return NextResponse.json({
            success: true,
            file: uploaded,
            folder: { id: folder.id, name: folder.name },
        })
    } catch (e) {
        if (e instanceof GoogleDriveConfigError) {
            return NextResponse.json(
                { success: false, stage: "config", error: e.message },
                { status: 503 }
            )
        }
        if (e instanceof GoogleDriveApiError) {
            return NextResponse.json(
                {
                    success: false,
                    stage: e.stage,
                    status: e.status,
                    googleCode: e.googleCode,
                    error: e.message,
                },
                { status: 502 }
            )
        }
        console.error("[api/admin/google-drive/test-upload] POST", e instanceof Error ? e.name : "unknown")
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
    }
}
