/**
 * Shared constants / validators for hybrid recorded lessons (YouTube + Storage upload).
 * Isolated from Stripe, theory quota, and live sessions.
 */

export const RECORDED_CLASSES_BUCKET = "recorded-classes"

/** Application-enforced max upload size (must be ≤ bucket file_size_limit). */
export const RECORDED_CLASS_MAX_BYTES = 524_288_000 // 500 MiB

export const RECORDED_CLASS_SIGNED_URL_SECONDS = 60 * 60 // 1 hour

export const RECORDED_CLASS_ALLOWED_MIME = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
] as const

export type RecordedClassMime = (typeof RECORDED_CLASS_ALLOWED_MIME)[number]

export type LessonSourceType = "youtube" | "upload"
export type LessonClassType = "trading" | "theory"

const EXT_BY_MIME: Record<RecordedClassMime, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
}

export function isLessonSourceType(value: unknown): value is LessonSourceType {
    return value === "youtube" || value === "upload"
}

export function isLessonClassType(value: unknown): value is LessonClassType {
    return value === "trading" || value === "theory"
}

export function isAllowedRecordedMime(value: string): value is RecordedClassMime {
    return (RECORDED_CLASS_ALLOWED_MIME as readonly string[]).includes(value)
}

export function extensionForRecordedMime(mime: RecordedClassMime): string {
    return EXT_BY_MIME[mime]
}

/** Private object path: uploads/{uuid}/video.{ext} */
export function buildRecordedClassStoragePath(objectId: string, mime: RecordedClassMime): string {
    const id = objectId.trim().toLowerCase()
    const ext = extensionForRecordedMime(mime)
    return `uploads/${id}/video.${ext}`
}

export function isValidRecordedClassStoragePath(path: string): boolean {
    return /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/video\.(mp4|webm|mov)$/i.test(
        path.trim()
    )
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
