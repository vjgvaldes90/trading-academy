"use client"

import { getTranslations, readStoredLanguage } from "@/lib/i18n"
import type { TranslationKeys } from "@/lib/i18n/en"

export type SecureJoinResult =
    | { ok: true; join_url: string }
    | { ok: false; message: string; code?: string }

export type AdminStartResult =
    | { ok: true; zoom_start_url: string }
    | { ok: false; message: string; code?: string }

function t(): TranslationKeys {
    return getTranslations(readStoredLanguage())
}

function messageForJoinCode(code: string | undefined, fallbackError?: string): string {
    const tr = t()
    switch (code) {
        case "unauthorized":
            return tr.secureJoinUnauthorized
        case "not_paid":
        case "access_denied":
            return tr.secureJoinAccessRequired
        case "session_not_found":
            return tr.secureJoinSessionNotFound
        case "session_not_live":
            return tr.secureJoinSessionUnavailable
        case "outside_join_window":
            return tr.secureJoinOutsideWindow
        case "missing_meeting_link":
            return tr.secureJoinMissingLink
        case "invalid_json":
        case "invalid_session_id":
        case "session_parse":
            return tr.secureJoinInvalidResponse
        case "internal_error":
            return tr.secureJoinInternalError
        default:
            return fallbackError?.trim() || tr.secureJoinFailed
    }
}

export async function fetchSecureStudentJoinUrl(sessionId: string): Promise<SecureJoinResult> {
    const res = await fetch("/api/session/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            session_id: sessionId,
        }),
    })
    const data = (await res.json().catch(() => ({}))) as {
        join_url?: string
        error?: string
        code?: string
    }
    if (!res.ok) {
        const code = typeof data.code === "string" ? data.code : undefined
        return {
            ok: false,
            message: messageForJoinCode(code, typeof data.error === "string" ? data.error : undefined),
            code,
        }
    }
    const url = typeof data.join_url === "string" ? data.join_url.trim() : ""
    if (!url) return { ok: false, message: t().secureJoinInvalidResponse }
    return { ok: true, join_url: url }
}

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase()
}

export async function fetchSecureAdminStartUrl(
    sessionId: string,
    adminEmail: string
): Promise<AdminStartResult> {
    const res = await fetch("/api/admin/session/host-join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            session_id: sessionId,
            admin_email: normalizeEmail(adminEmail),
        }),
    })
    const data = (await res.json().catch(() => ({}))) as {
        zoom_start_url?: string
        error?: string
        code?: string
    }
    if (!res.ok) {
        return {
            ok: false,
            message:
                typeof data.error === "string" && data.error.trim()
                    ? data.error
                    : t().secureAdminStartFailed,
            code: typeof data.code === "string" ? data.code : undefined,
        }
    }
    const url = typeof data.zoom_start_url === "string" ? data.zoom_start_url.trim() : ""
    if (!url) return { ok: false, message: t().secureJoinInvalidResponse }
    return { ok: true, zoom_start_url: url }
}
