"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { useEffect } from "react"

export type ComingSoonFeature = "classes" | "resources"

type ComingSoonModalProps = {
    open: boolean
    feature: ComingSoonFeature | null
    onClose: () => void
}

export default function ComingSoonModal({ open, feature, onClose }: ComingSoonModalProps) {
    const { t } = useLanguage()

    useEffect(() => {
        if (!open) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, onClose])

    if (!open || !feature) return null

    const emoji = feature === "classes" ? "🎥" : "📚"
    const message =
        feature === "classes" ? t.comingSoonRecordedMessage : t.comingSoonResourcesMessage

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coming-soon-modal-title"
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4 sm:p-5"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#111827] to-[#0B0F1A] p-5 shadow-[0_24px_48px_rgba(0,0,0,0.5)] sm:p-6"
                onClick={(ev) => ev.stopPropagation()}
            >
                <p className="text-center text-3xl" aria-hidden>
                    {emoji}
                </p>
                <h2
                    id="coming-soon-modal-title"
                    className="mt-3 text-center text-lg font-extrabold text-slate-50"
                >
                    {t.comingSoonModalTitle}
                </h2>
                <p className="mt-2 text-center text-sm leading-relaxed text-slate-400">{message}</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full rounded-xl border border-blue-400/35 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
                >
                    {t.comingSoonGotIt}
                </button>
            </div>
        </div>
    )
}
