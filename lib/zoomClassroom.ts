export type ZoomClassroomProvider = "browser-join" | "meeting-sdk"

/**
 * Phase 2 readiness:
 * Keep classroom rendering provider-driven so Zoom Meeting SDK can be introduced
 * without changing dashboard navigation or join-security flow.
 */
export const ZOOM_CLASSROOM_PROVIDER: ZoomClassroomProvider = "browser-join"

export function canRenderZoomIframe(url: string): boolean {
    return /^https:\/\/([a-z0-9-]+\.)?zoom\.us\/.+/i.test(url.trim())
}

function normalizeJoinName(value: string): string {
    return value.trim().replace(/\s+/g, " ").slice(0, 120)
}

/**
 * Prefill participant display name for Zoom links when URL-based params are supported.
 * Keeps non-Zoom links unchanged.
 */
export function buildJoinUrlWithPreferredName(rawUrl: string, preferredName: string): string {
    const urlValue = rawUrl.trim()
    const joinName = normalizeJoinName(preferredName)
    if (!urlValue || !joinName || !canRenderZoomIframe(urlValue)) return urlValue
    try {
        const parsed = new URL(urlValue)
        parsed.searchParams.set("uname", joinName)
        return parsed.toString()
    } catch {
        return urlValue
    }
}
