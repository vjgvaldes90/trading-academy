import { NextResponse } from "next/server"
import type { AnnouncementServiceResult } from "@/lib/announcements/types"

export function announcementResultToResponse<T>(
    result: AnnouncementServiceResult<T>,
    successStatus = 200
): NextResponse {
    if (result.ok) {
        return NextResponse.json({ ok: true, data: result.data }, { status: successStatus })
    }

    const status =
        result.code === "unauthorized"
            ? 401
            : result.code === "forbidden"
              ? 403
              : result.code === "not_found" || result.code === "student_not_found"
                ? 404
                : result.code === "validation_error"
                  ? 400
                  : result.code === "not_published"
                    ? 409
                    : 500

    return NextResponse.json(
        { ok: false, error: result.error, code: result.code ?? "error" },
        { status }
    )
}

export function parseCsvOrSingle<T extends string>(
    raw: string | null,
    allow: readonly T[]
): T | T[] | undefined {
    if (!raw?.trim()) return undefined
    const parts = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as T[]
    const filtered = parts.filter((p): p is T => (allow as readonly string[]).includes(p))
    if (filtered.length === 0) return undefined
    return filtered.length === 1 ? filtered[0] : filtered
}
