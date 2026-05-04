/** Strip Zoom / Meet URLs from API payloads (lists, hydration). */
export function stripSensitiveSessionFields<T extends Record<string, unknown>>(row: T): T {
    const out = { ...row } as Record<string, unknown>
    delete out.link
    delete out.session_link
    delete out.zoom_start_url
    delete out.zoom_password
    delete out.zoom_meeting_id
    return out as T
}
