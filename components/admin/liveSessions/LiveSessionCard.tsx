"use client"

import type { AdminSessionRow } from "@/components/admin/liveSessions/types"
import { useLanguage } from "@/context/LanguageProvider"
import { isWithinAdminHostWindow, type DbSession } from "@/lib/sessions"

function adminRowToDbSession(r: AdminSessionRow): DbSession {
    return {
        id: r.id,
        day: null,
        date: r.date,
        time: r.time,
        link: null,
    }
}

/**
 * Single live session row — host window controls.
 */
export default function LiveSessionCard({
    row,
    highlighted,
    now,
    onEditSession,
    onRequestCancelSession,
    onHostStart,
}: {
    row: AdminSessionRow
    highlighted: boolean
    now: Date
    onEditSession: (row: AdminSessionRow) => void
    onRequestCancelSession: (row: AdminSessionRow) => void
    onHostStart: (sessionId: string) => void | Promise<void>
}) {
    const { t } = useLanguage()
    const hostAllowed =
        (row.status ?? "active") === "active" && isWithinAdminHostWindow(adminRowToDbSession(row), now)

    const title = row.title?.trim() || t.liveSessionDefault

    return (
        <article
            className={`flex flex-col rounded-xl border transition-colors ${
                highlighted
                    ? "border-amber-500/35 bg-amber-500/[0.06] shadow-[0_0_0_1px_rgba(245,158,11,0.12)]"
                    : "border-white/10 bg-[#0f172a]/80 hover:border-sky-500/25"
            }`}
        >
            <div className="border-b border-white/10 px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                    {row.date ?? "—"} · {row.time ?? "—"}
                </p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-100">{title}</h3>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-4 py-3">
                <div>
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
                        {t.statusLabel}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-emerald-300">{t.liveSession}</p>
                </div>
            </div>

            <div className="mt-auto flex flex-col gap-2 border-t border-white/10 bg-black/20 px-3 py-3">
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onEditSession(row)}
                        className="rounded-lg border border-slate-500/40 bg-slate-900/75 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-400/60"
                    >
                        {t.edit}
                    </button>
                    <button
                        type="button"
                        onClick={() => onRequestCancelSession(row)}
                        className="rounded-lg border border-red-400/45 bg-red-950/35 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-950/50"
                    >
                        {t.cancelSession}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={!hostAllowed}
                        onClick={() => void onHostStart(row.id)}
                        className="rounded-lg border border-sky-500/45 bg-blue-950/40 px-3 py-2 text-xs font-bold text-sky-200 transition enabled:cursor-pointer enabled:hover:bg-blue-950/60 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                        {t.enterAsHostZoom}
                    </button>
                </div>
            </div>
        </article>
    )
}
