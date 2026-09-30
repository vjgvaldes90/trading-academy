import { NextResponse } from "next/server"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { isAuthorizedAdminEmail } from "@/lib/adminEmails"
import {
    GoogleDriveApiError,
    GoogleDriveConfigError,
    getDriveFileForDownload,
    isGoogleWifConfigured,
    openDriveFileMedia,
} from "@/lib/googleDrive"
import { isValidGoogleDriveFileId } from "@/lib/recordedLessons"
import { getVerifiedStudentEmailFromCookies } from "@/lib/requireVerifiedSessionCookie"
import {
    evaluateAcademyAccess,
    type TradingStudentAccessRow,
} from "@/lib/studentAcademyAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteContext = {
    params: Promise<{ id: string }>
}

type ByteRange = { start: number; end: number }

function jsonError(status: number, error: string, code: string) {
    return NextResponse.json({ ok: false, error, code }, { status })
}

/** Single range only: `bytes=a-b`, `bytes=a-`, `bytes=-n`. */
function parseRangeHeader(raw: string | null, size: number): ByteRange | "unsatisfiable" | null {
    if (!raw) return null
    const m = /^bytes=(\d*)-(\d*)$/.exec(raw.trim())
    if (!m || (m[1] === "" && m[2] === "")) return null
    if (m[1] === "") {
        const suffix = Number(m[2])
        if (!Number.isSafeInteger(suffix) || suffix <= 0) return "unsatisfiable"
        return { start: Math.max(0, size - suffix), end: size - 1 }
    }
    const start = Number(m[1])
    const end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1)
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
        return "unsatisfiable"
    }
    return { start, end }
}

function buildDownloadFilename(title: string, driveName: string, mimeType: string): string {
    const extFromName = /\.([A-Za-z0-9]{2,5})$/.exec(driveName)?.[1]?.toLowerCase()
    const ext = mimeType === "video/mp4" ? "mp4" : extFromName || "mp4"
    const base = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)
    return `${base || "Recorded Class"}.${ext}`
}

function contentDisposition(filename: string): string {
    const ascii = filename.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "'")
    return `attachment; filename="${ascii || "recorded-class.mp4"}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

/**
 * Authenticated download of a recorded class stored privately in Google Drive.
 * Same access rules as /api/lessons (academy access; admins bypass).
 * The Drive file ID comes only from the lessons row; the file is streamed server-side
 * with the project's WIF read-only token and never made public.
 * `?check=1` validates everything and returns JSON without transferring the file.
 */
export async function GET(req: Request, context: RouteContext) {
    try {
        const email = await getVerifiedStudentEmailFromCookies()
        if (!email) {
            return jsonError(401, "Unauthorized", "unauthorized")
        }

        const { id: rawId } = await context.params
        const id = typeof rawId === "string" ? rawId.trim() : ""
        if (!id || !UUID_RE.test(id)) {
            return jsonError(400, "Invalid lesson id", "invalid_lesson_id")
        }

        const supabase = createSupabaseServiceRoleClient()

        if (!isAuthorizedAdminEmail(email)) {
            const { data: row, error: accessErr } = await supabase
                .from("trading_students")
                .select(
                    "access_code, access_type, is_active, access_expires_at, subscription_id, subscription_status"
                )
                .eq("email", email)
                .maybeSingle()

            if (accessErr) {
                console.error("[api/lessons/download] access lookup", accessErr.message)
                return jsonError(500, "Access check failed", "access_check_failed")
            }

            const academyEv = evaluateAcademyAccess(row as TradingStudentAccessRow | null)
            if (!academyEv.ok) {
                return jsonError(403, "Academy access denied", academyEv.reason ?? "not_found")
            }
        }

        const { data: lesson, error: lessonErr } = await supabase
            .from("lessons")
            .select("id, title, content_type, is_published, google_drive_file_id")
            .eq("id", id)
            .maybeSingle()

        if (lessonErr) {
            console.error("[api/lessons/download] lesson lookup", lessonErr.message)
            return jsonError(500, "Failed to load lesson", "lesson_lookup_failed")
        }
        if (!lesson || lesson.is_published !== true) {
            return jsonError(404, "Lesson not found", "lesson_not_found")
        }
        if (lesson.content_type !== "recorded_class") {
            return jsonError(400, "Lesson is not a recorded class", "not_recorded_class")
        }
        const driveFileId =
            typeof lesson.google_drive_file_id === "string" ? lesson.google_drive_file_id.trim() : ""
        if (!driveFileId || !isValidGoogleDriveFileId(driveFileId)) {
            return jsonError(404, "Download not available", "download_not_available")
        }

        const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID?.trim() || ""
        if (!isGoogleWifConfigured() || !sharedDriveId) {
            console.error("[api/lessons/download] Google Drive is not configured")
            return jsonError(503, "Download not available", "drive_not_configured")
        }

        const file = await getDriveFileForDownload(driveFileId, req.headers)
        if (file.id !== driveFileId || file.driveId !== sharedDriveId || file.trashed || file.size <= 0) {
            console.error("[api/lessons/download] file not usable", {
                lessonId: id,
                inSharedDrive: file.driveId === sharedDriveId,
                trashed: file.trashed,
                hasSize: file.size > 0,
            })
            return jsonError(404, "Download not available", "file_unavailable")
        }

        const url = new URL(req.url)
        if (url.searchParams.get("check") === "1") {
            return NextResponse.json({ ok: true })
        }

        const etag = file.md5Checksum ? `"${file.md5Checksum}"` : ""
        const lastModified = file.modifiedTime ? new Date(file.modifiedTime).toUTCString() : ""

        let rangeHeader = req.headers.get("range")
        const ifRange = req.headers.get("if-range")?.trim()
        if (rangeHeader && ifRange && ifRange !== etag && ifRange !== lastModified) {
            rangeHeader = null
        }
        const range = parseRangeHeader(rangeHeader, file.size)
        if (range === "unsatisfiable") {
            return new Response(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${file.size}`, "Accept-Ranges": "bytes" },
            })
        }

        const driveRes = await openDriveFileMedia({
            fileId: driveFileId,
            headers: req.headers,
            range,
            signal: req.signal,
        })

        if (!driveRes.ok || !driveRes.body) {
            const text = await driveRes.text().catch(() => "")
            console.error("[api/lessons/download] alt=media failed", {
                lessonId: id,
                status: driveRes.status,
                body: text.slice(0, 300),
            })
            return jsonError(502, "Download failed", "drive_download_failed")
        }

        const rangeHonored =
            range !== null &&
            driveRes.status === 206 &&
            driveRes.headers.get("content-range") === `bytes ${range.start}-${range.end}/${file.size}`

        const headers = new Headers({
            "Content-Type": file.mimeType.startsWith("video/") ? file.mimeType : "application/octet-stream",
            "Content-Length": String(rangeHonored && range ? range.end - range.start + 1 : file.size),
            "Content-Disposition": contentDisposition(
                buildDownloadFilename(typeof lesson.title === "string" ? lesson.title : "", file.name, file.mimeType)
            ),
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        })
        if (rangeHonored && range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${file.size}`)
        if (etag) headers.set("ETag", etag)
        if (lastModified) headers.set("Last-Modified", lastModified)

        return new Response(driveRes.body, { status: rangeHonored ? 206 : 200, headers })
    } catch (e) {
        if (e instanceof GoogleDriveConfigError || e instanceof GoogleDriveApiError) {
            console.error("[api/lessons/download] Google Drive error", e.message)
            return jsonError(502, "Download not available", "drive_error")
        }
        console.error("[api/lessons/download] GET", e instanceof Error ? e.name : "unknown")
        return jsonError(500, "Internal error", "internal_error")
    }
}
