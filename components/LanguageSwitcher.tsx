"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage, type Language } from "@/context/LanguageProvider"

const options: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇪🇸" },
]

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handlePointerDown)
        return () => document.removeEventListener("mousedown", handlePointerDown)
    }, [open])

    const currentLabel = language === "en" ? "EN" : "ES"

    return (
        <div ref={containerRef} className="fixed bottom-6 right-6 z-[60]">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-blue-400/25 bg-[#0B1220]/95 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-[0_12px_28px_rgba(2,6,23,0.55)] backdrop-blur transition hover:border-blue-300/40 hover:brightness-110"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label="Change language"
            >
                <span aria-hidden>🌐</span>
                <span>{currentLabel}</span>
            </button>

            {open && (
                <div
                    className="absolute bottom-full right-0 mb-2 min-w-[10.5rem] overflow-hidden rounded-xl border border-blue-400/20 bg-[#0B1220]/98 py-1 shadow-[0_16px_40px_rgba(2,6,23,0.65)] backdrop-blur"
                    role="listbox"
                >
                    {options.map((option) => {
                        const isActive = option.code === language
                        return (
                            <button
                                key={option.code}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                    setLanguage(option.code)
                                    setOpen(false)
                                }}
                                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${
                                    isActive
                                        ? "bg-blue-500/15 text-blue-200"
                                        : "text-slate-200 hover:bg-white/5"
                                }`}
                            >
                                <span aria-hidden>{option.flag}</span>
                                <span>{option.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
