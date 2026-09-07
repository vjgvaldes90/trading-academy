"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { useEffect, useState } from "react"

type RequestPrivateClassModalProps = {
    open: boolean
    onClose: () => void
    onCreated: () => void
    onSuccessToast: (message: string) => void
    onErrorToast: (message: string) => void
}

export default function RequestPrivateClassModal({
    open,
    onClose,
    onCreated,
    onSuccessToast,
    onErrorToast,
}: RequestPrivateClassModalProps) {
    const { t } = useLanguage()
    const [date, setDate] = useState("")
    const [time, setTime] = useState("")
    const [message, setMessage] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        setDate("")
        setTime("")
        setMessage("")
        setFormError(null)
        setSubmitting(false)
    }, [open])

    if (!open) return null

    const handleClose = () => {
        if (submitting) return
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        if (!date.trim() || !time.trim()) {
            setFormError(t.supportFieldRequired)
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch("/api/private-class-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({
                    requested_date: date.trim(),
                    requested_time: time.trim(),
                    student_message: message.trim() || null,
                }),
            })
            const payload = (await res.json().catch(() => ({}))) as {
                error?: string
                code?: string
            }
            if (!res.ok) {
                const msg =
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : t.privateClassCreateError
                setFormError(msg)
                onErrorToast(msg)
                return
            }
            onClose()
            onCreated()
            onSuccessToast(t.privateClassCreateSuccess)
        } catch {
            setFormError(t.privateClassCreateError)
            onErrorToast(t.privateClassCreateError)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-private-class-title"
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-5"
            onClick={submitting ? undefined : handleClose}
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#111827] to-[#0B0F1A] shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                onClick={(ev) => ev.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                    <h2 id="request-private-class-title" className="text-lg font-extrabold text-slate-50">
                        {t.privateClassModalTitle}
                    </h2>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleClose}
                        className="rounded-lg border border-white/15 bg-[#0f172a] px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-60"
                    >
                        {t.close}
                    </button>
                </div>

                <p className="px-6 pt-4 text-xs leading-relaxed text-slate-500">{t.privateClassNyHint}</p>

                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
                    <div>
                        <label htmlFor="private-class-date" className="mb-1.5 block text-xs font-medium text-slate-400">
                            {t.privateClassRequestedDate}
                        </label>
                        <input
                            id="private-class-date"
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                        />
                    </div>
                    <div>
                        <label htmlFor="private-class-time" className="mb-1.5 block text-xs font-medium text-slate-400">
                            {t.privateClassRequestedTime}
                        </label>
                        <input
                            id="private-class-time"
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="private-class-message"
                            className="mb-1.5 block text-xs font-medium text-slate-400"
                        >
                            {t.privateClassMessageOptional}
                        </label>
                        <textarea
                            id="private-class-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t.privateClassMessagePlaceholder}
                            disabled={submitting}
                            rows={4}
                            maxLength={2000}
                            className="w-full resize-y rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                        />
                    </div>

                    {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? t.privateClassSubmitting : t.privateClassSubmit}
                    </button>
                </form>
            </div>
        </div>
    )
}
