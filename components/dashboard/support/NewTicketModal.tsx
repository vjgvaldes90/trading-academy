"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { createSupportTicketAction } from "@/app/actions/support"
import { SUPPORT_TICKET_CATEGORIES, type SupportTicketCategory } from "@/lib/support/types"
import { supportCategoryLabel } from "@/components/dashboard/support/supportLabels"
import { useState } from "react"

type NewTicketModalProps = {
    open: boolean
    onClose: () => void
    onCreated: () => void
    onSuccessToast: (message: string) => void
    onErrorToast: (message: string) => void
}

export default function NewTicketModal({
    open,
    onClose,
    onCreated,
    onSuccessToast,
    onErrorToast,
}: NewTicketModalProps) {
    const { t } = useLanguage()
    const [subject, setSubject] = useState("")
    const [category, setCategory] = useState<SupportTicketCategory | "">("")
    const [body, setBody] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    if (!open) return null

    const reset = () => {
        setSubject("")
        setCategory("")
        setBody("")
        setFormError(null)
    }

    const handleClose = () => {
        if (submitting) return
        reset()
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        const subjectTrim = subject.trim()
        const bodyTrim = body.trim()
        if (!subjectTrim || !category || !bodyTrim) {
            setFormError(t.supportFieldRequired)
            return
        }

        setSubmitting(true)
        try {
            const result = await createSupportTicketAction({
                subject: subjectTrim,
                category,
                body: bodyTrim,
                priority: "normal",
            })
            if (!result.ok) {
                onErrorToast(result.error || t.supportCreateError)
                return
            }
            reset()
            onClose()
            onCreated()
            onSuccessToast(t.supportCreateSuccess)
        } catch {
            onErrorToast(t.supportCreateError)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-support-ticket-title"
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-5"
            onClick={submitting ? undefined : handleClose}
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#111827] to-[#0B0F1A] shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                onClick={(ev) => ev.stopPropagation()}
            >
                <div className="border-b border-white/10 px-6 py-4">
                    <h2 id="new-support-ticket-title" className="text-lg font-extrabold text-slate-50">
                        {t.supportNewTicket}
                    </h2>
                </div>

                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-6 py-5">
                    <div>
                        <label htmlFor="support-subject" className="mb-1.5 block text-xs font-medium text-slate-400">
                            {t.supportSubject}
                        </label>
                        <input
                            id="support-subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={t.supportSubjectPlaceholder}
                            disabled={submitting}
                            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label htmlFor="support-category" className="mb-1.5 block text-xs font-medium text-slate-400">
                            {t.supportCategory}
                        </label>
                        <select
                            id="support-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value as SupportTicketCategory | "")}
                            disabled={submitting}
                            className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                        >
                            <option value="">{t.supportSelectCategory}</option>
                            {SUPPORT_TICKET_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {supportCategoryLabel(t, c)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="support-description" className="mb-1.5 block text-xs font-medium text-slate-400">
                            {t.supportDescription}
                        </label>
                        <textarea
                            id="support-description"
                            rows={5}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={t.supportDescriptionPlaceholder}
                            disabled={submitting}
                            className="w-full resize-y rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
                        />
                    </div>

                    {formError ? (
                        <p className="text-sm text-red-400" role="alert">
                            {formError}
                        </p>
                    ) : null}

                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleClose}
                            className="rounded-xl border border-white/10 bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                        >
                            {t.supportClose}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:opacity-60"
                        >
                            {submitting ? t.supportCreating : t.supportCreateSubmit}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
