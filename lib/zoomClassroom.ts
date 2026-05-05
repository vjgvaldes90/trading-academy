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
