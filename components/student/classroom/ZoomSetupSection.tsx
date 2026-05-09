"use client"

import { CheckCircle2, Download, FileText, PlayCircle, Sparkles } from "lucide-react"

export type ZoomSetupPanelState = "loading" | "visible" | "hidden"

type ZoomSetupSectionProps = {
    status: ZoomSetupPanelState
    zoomDownloadHref: string
    zoomPdfHref: string
    zoomVideoHref: string
    onDismissBrowser: () => void
    onDismissPersistent: () => void
}

/**
 * Single source of truth for premium Zoom onboarding on the student classroom page.
 * Visibility is driven only by parent state + localStorage for "Ya tengo Zoom" (not sessionStorage browser dismiss).
 */
export default function ZoomSetupSection({
    status,
    zoomDownloadHref,
    zoomPdfHref,
    zoomVideoHref,
    onDismissBrowser,
    onDismissPersistent,
}: ZoomSetupSectionProps) {
    if (status === "hidden") return null

    if (status === "loading") {
        return (
            <div
                className="mt-6 rounded-2xl border border-blue-400/20 bg-[#0A1020]/80 p-5 shadow-inner shadow-black/20 ring-1 ring-blue-500/10 sm:p-6"
                aria-busy="true"
                aria-label="Cargando configuración recomendada"
            >
                <div className="flex animate-pulse flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-700/80" />
                        <div className="flex-1 space-y-2">
                            <div className="h-2.5 w-28 rounded bg-slate-700/70" />
                            <div className="h-4 w-48 max-w-full rounded bg-slate-600/60" />
                        </div>
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="h-3 w-full rounded bg-slate-700/50" />
                        <div className="h-3 w-[92%] rounded bg-slate-700/40" />
                    </div>
                    <div className="grid gap-3 pt-2 sm:grid-cols-3">
                        <div className="h-12 rounded-xl bg-slate-700/50" />
                        <div className="h-12 rounded-xl bg-slate-700/40" />
                        <div className="h-12 rounded-xl bg-slate-700/40" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-6 rounded-2xl border border-blue-400/30 bg-gradient-to-br from-[#0c1528]/98 via-[#0A1020] to-[#050a14] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.7)] ring-1 ring-blue-500/15 sm:p-6">
            <div className="flex flex-col gap-1 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-500/10 text-amber-200">
                        <Sparkles className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400/90">
                            Recommended Setup
                        </p>
                        <h2 className="text-base font-bold text-slate-100 sm:text-lg">Configuración recomendada</h2>
                    </div>
                </div>
                <p className="mt-2 max-w-xl text-xs font-medium text-slate-500 sm:mt-0 sm:text-right">
                    Estándar institucional: <span className="text-slate-300">Zoom para escritorio</span> (mejor video,
                    audio y gráficos).
                </p>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Instala y prueba Zoom antes de tu primera sesión en vivo. Reduce fallos técnicos y sube la calidad de tu
                experiencia premium en Smart Option Academy.
            </p>

            <ul className="mt-4 space-y-2.5">
                {[
                    "Zoom escritorio: la experiencia preferida para sesiones institucionales",
                    "Mejor pantalla compartida y lectura de gráficos",
                    "Menor latencia y audio más estable",
                    "Menos fricción que el navegador para sesiones largas",
                ].map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-400/90" aria-hidden />
                        <span>{line}</span>
                    </li>
                ))}
            </ul>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <a
                    href={zoomDownloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-blue-300/45 bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(37,99,235,0.38)] transition hover:brightness-110"
                >
                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                    Descargar Zoom (escritorio)
                </a>
                <a
                    href={zoomPdfHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-500/45 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-400/35 hover:bg-slate-800/70"
                >
                    <FileText className="h-4 w-4 shrink-0 text-blue-300" aria-hidden />
                    Guía PDF de configuración
                </a>
                <a
                    href={zoomVideoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-500/45 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-400/35 hover:bg-slate-800/70"
                >
                    <PlayCircle className="h-4 w-4 shrink-0 text-blue-300" aria-hidden />
                    Video tutorial
                </a>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 border-t border-white/10 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                    type="button"
                    onClick={onDismissBrowser}
                    className="inline-flex min-h-[42px] min-w-[44px] items-center justify-center rounded-lg border border-slate-500/40 bg-slate-900/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400/50 hover:bg-slate-800/50"
                >
                    Continuar con navegador
                </button>
                <button
                    type="button"
                    onClick={onDismissPersistent}
                    className="text-center text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-400 hover:underline sm:ml-auto"
                >
                    Ya tengo Zoom instalado
                </button>
            </div>
        </div>
    )
}
