"use client"

import { useEffect } from "react"

export type StudentToastTone = "success" | "error"

export default function StudentToast({
    message,
    tone = "success",
    onDismiss,
    durationMs = 3200,
}: {
    message: string
    tone?: StudentToastTone
    onDismiss: () => void
    durationMs?: number
}) {
    useEffect(() => {
        const t = window.setTimeout(onDismiss, durationMs)
        return () => window.clearTimeout(t)
    }, [onDismiss, durationMs, message])

    const toneClass =
        tone === "success"
            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
            : "border-red-400/30 bg-red-500/15 text-red-100"

    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-6 left-1/2 z-[70] max-w-sm -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-[0_16px_40px_rgba(2,6,23,0.55)] backdrop-blur ${toneClass}`}
        >
            {message}
        </div>
    )
}
