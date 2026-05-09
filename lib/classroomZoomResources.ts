/**
 * Student classroom — Zoom onboarding links.
 * Override with NEXT_PUBLIC_* for custom academy PDF / video hosting.
 */

export function zoomDesktopDownloadUrl(): string {
    return "https://zoom.us/download#client_4meeting"
}

export function zoomSetupGuidePdfUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_SOA_CLASSROOM_ZOOM_PDF_URL?.trim()
    if (fromEnv) return fromEnv
    return "/docs/smart-option-zoom-setup.pdf"
}

/** Replace with your academy-hosted tutorial (YouTube, Vimeo, etc.). */
export function zoomTutorialVideoUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_SOA_CLASSROOM_ZOOM_VIDEO_URL?.trim()
    if (fromEnv) return fromEnv
    return "https://support.zoom.us/hc/en-us/articles/206618765-Zoom-Video-Tutorials"
}
