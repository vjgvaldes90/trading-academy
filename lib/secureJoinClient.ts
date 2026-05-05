"use client"

export type SecureJoinResult =
    | { ok: true; join_url: string }
    | { ok: false; message: string; code?: string }

export async function fetchSecureStudentJoinUrl(
    sessionId: string,
    userEmail: string
): Promise<SecureJoinResult> {
    const res = await fetch("/api/session/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            session_id: sessionId,
            user_email: userEmail.trim().toLowerCase(),
        }),
    })
    const data = (await res.json().catch(() => ({}))) as {
        join_url?: string
        error?: string
        code?: string
    }
    if (!res.ok) {
        return {
            ok: false,
            message: typeof data.error === "string" ? data.error : "No se pudo unir a la sesión",
            code: typeof data.code === "string" ? data.code : undefined,
        }
    }
    const url = typeof data.join_url === "string" ? data.join_url.trim() : ""
    if (!url) return { ok: false, message: "Respuesta inválida del servidor" }
    return { ok: true, join_url: url }
}

export type AdminStartResult =
    | { ok: true; zoom_start_url: string }
    | { ok: false; message: string; code?: string }

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
            message: typeof data.error === "string" ? data.error : "No se pudo abrir la sesión",
            code: typeof data.code === "string" ? data.code : undefined,
        }
    }
    const url = typeof data.zoom_start_url === "string" ? data.zoom_start_url.trim() : ""
    if (!url) return { ok: false, message: "Respuesta inválida del servidor" }
    return { ok: true, zoom_start_url: url }
}
