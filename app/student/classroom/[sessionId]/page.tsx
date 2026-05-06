"use client"

import { CheckCircle2, Download } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import SiteFooter from "@/components/shared/SiteFooter"
import { fetchSecureStudentJoinUrl } from "@/lib/secureJoinClient"
import { resolveDashboardStudent } from "@/lib/studentLocalStorage"
import { buildJoinUrlWithPreferredName } from "@/lib/zoomClassroom"

/** Returning students: persistently hide Zoom desktop recommendation. */
const ZOOM_SETUP_ACK_LS = "soa_classroom_zoom_desktop_ack"

/** Acknowledge browser path for current tab only (still allows full join flow). */
const ZOOM_BROWSER_PATH_SS = "soa_classroom_zoom_browser_session"

type SessionPreview = {
    id: string
    title: string
    day: string
    time: string
}

function readSessionPreview(raw: unknown): SessionPreview | null {
    const rec = raw as Record<string, unknown>
    const id = typeof rec.id === "string" ? rec.id : ""
    if (!id) return null
    const title = typeof rec.title === "string" && rec.title.trim() ? rec.title.trim() : "Sesion en vivo"
    const day = typeof rec.day === "string" ? rec.day.trim() : ""
    const time = typeof rec.time === "string" ? rec.time.trim() : ""
    return { id, title, day, time }
}

export default function StudentClassroomPage() {
    const params = useParams<{ sessionId: string }>()
    const router = useRouter()
    const sessionId = typeof params?.sessionId === "string" ? params.sessionId.trim() : ""

    const [studentEmail, setStudentEmail] = useState<string>("")
    const [studentJoinName, setStudentJoinName] = useState<string>("")
    const [sessionPreview, setSessionPreview] = useState<SessionPreview | null>(null)
    const [joinUrl, setJoinUrl] = useState<string>("")
    const [loadingJoin, setLoadingJoin] = useState(false)
    const [error, setError] = useState<string>("")
    const [hideZoomRecommendation, setHideZoomRecommendation] = useState(false)

    useEffect(() => {
        try {
            const ack = window.localStorage.getItem(ZOOM_SETUP_ACK_LS)
            const browserAck = window.sessionStorage.getItem(ZOOM_BROWSER_PATH_SS)
            setHideZoomRecommendation(ack === "1" || browserAck === "1")
        } catch {
            setHideZoomRecommendation(false)
        }
    }, [])

    const dismissZoomRecommendationPersistent = () => {
        try {
            window.localStorage.setItem(ZOOM_SETUP_ACK_LS, "1")
        } catch {
            /* ignore quota / privacy mode */
        }
        setHideZoomRecommendation(true)
    }

    const dismissZoomRecommendationBrowser = () => {
        try {
            window.sessionStorage.setItem(ZOOM_BROWSER_PATH_SS, "1")
        } catch {
            /* ignore */
        }
        setHideZoomRecommendation(true)
    }

    useEffect(() => {
        const student = resolveDashboardStudent()
        if (!student?.email) {
            router.replace(`/login?redirect=${encodeURIComponent(`/student/classroom/${sessionId}`)}`)
            return
        }
        const email = student.email.trim().toLowerCase()
        const preferredName = student.name?.trim() || email
        setStudentEmail(email)
        setStudentJoinName(preferredName)
    }, [router, sessionId])

    useEffect(() => {
        if (!studentEmail || !sessionId) return
        let cancelled = false
        void (async () => {
            try {
                const res = await fetch(`/api/sessions?user_email=${encodeURIComponent(studentEmail)}`, {
                    cache: "no-store",
                    credentials: "include",
                })
                if (!res.ok) return
                const payload = (await res.json().catch(() => [])) as unknown[]
                if (!Array.isArray(payload)) return
                const session = payload.map(readSessionPreview).find((s) => s?.id === sessionId) ?? null
                if (!cancelled) setSessionPreview(session)
            } catch {
                // Keep classroom usable even if session metadata fetch fails.
            }
        })()
        return () => {
            cancelled = true
        }
    }, [studentEmail, sessionId])

    const sessionTitle = sessionPreview?.title ?? "Aula de sesion en vivo"
    const scheduleLine = [sessionPreview?.day ?? "", sessionPreview?.time ?? ""].filter(Boolean).join(" - ")

    const prepareJoin = async (): Promise<string | null> => {
        if (!studentEmail || !sessionId || loadingJoin) return null
        setError("")
        setLoadingJoin(true)
        try {
            const result = await fetchSecureStudentJoinUrl(sessionId, studentEmail)
            if (!result.ok) {
                setError(result.message)
                return null
            }
            const preparedUrl = buildJoinUrlWithPreferredName(
                result.join_url,
                studentJoinName || studentEmail
            )
            setJoinUrl(preparedUrl)
            return preparedUrl
        } finally {
            setLoadingJoin(false)
        }
    }

    const handleEnterLiveClass = async () => {
        if (loadingJoin) return
        let url: string | null = joinUrl || null
        if (!url) {
            url = await prepareJoin()
        }
        if (!url && studentEmail && sessionId) {
            const result = await fetchSecureStudentJoinUrl(sessionId, studentEmail)
            if (!result.ok) {
                setError(result.message)
                return
            }
            const preparedUrl = buildJoinUrlWithPreferredName(
                result.join_url,
                studentJoinName || studentEmail
            )
            url = preparedUrl
            setJoinUrl(preparedUrl)
        }
        if (url) {
            window.location.href = url
        }
    }

    useEffect(() => {
        if (!studentEmail || !sessionId) return
        void prepareJoin()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentEmail, sessionId, studentJoinName])

    return (
        <div className="min-h-screen bg-[#020617] text-white">
            <header className="sticky top-0 z-40 border-b border-blue-400/15 bg-[#020617]/92 backdrop-blur-md shadow-[0_1px_0_rgba(59,130,246,0.08)]">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <p className="min-w-0 text-sm font-semibold tracking-tight text-slate-100">
                        <span className="text-blue-400">Smart Option Academy</span>
                        <span className="font-normal text-slate-500"> | </span>
                        <span className="text-slate-300">Aula del Estudiante</span>
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-blue-300/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/50 hover:bg-blue-500/20"
                    >
                        Volver al Dashboard
                    </Link>
                </div>
            </header>
            <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
                <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
                    <section className="rounded-2xl border border-blue-300/20 bg-[#0B1220]/95 p-4 shadow-[0_20px_52px_rgba(2,6,23,0.55)] sm:p-6">
                        <h1 className="text-2xl font-bold leading-tight text-slate-100 sm:text-3xl">{sessionTitle}</h1>
                        {scheduleLine ? <p className="mt-1 text-sm text-slate-400">{scheduleLine}</p> : null}

                        {!hideZoomRecommendation ? (
                            <div className="mt-6 rounded-2xl border border-blue-400/25 bg-gradient-to-br from-[#0B1220]/95 via-[#0A1020] to-[#080d18] p-5 shadow-[0_18px_44px_rgba(2,6,23,0.65)] ring-1 ring-blue-500/10 sm:p-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 flex-1 gap-3">
                                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/35 bg-blue-500/15 text-blue-200 shadow-inner shadow-blue-500/10">
                                            <Download className="h-5 w-5" aria-hidden />
                                        </span>
                                        <div className="min-w-0">
                                            <h2 className="text-base font-bold leading-snug text-slate-100 sm:text-lg">
                                                Experiencia recomendada para tu sesión en vivo
                                            </h2>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                                Para obtener la mejor calidad en gráficos, audio y ejecución en tiempo
                                                real, recomendamos instalar la aplicación oficial de Zoom antes de
                                                comenzar.
                                            </p>
                                            <ul className="mt-4 space-y-2.5">
                                                {[
                                                    "Mejor calidad de gráficos y pantalla compartida",
                                                    "Menor retraso (delay)",
                                                    "Audio más estable",
                                                    "Acceso más fluido a sesiones premium",
                                                ].map((line) => (
                                                    <li key={line} className="flex items-start gap-2 text-sm text-slate-300">
                                                        <CheckCircle2
                                                            className="mt-0.5 h-4 w-4 shrink-0 text-blue-400/90"
                                                            aria-hidden
                                                        />
                                                        <span>{line}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
                                    <a
                                        href="https://zoom.us/download"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-[42px] min-w-[44px] items-center justify-center rounded-lg border border-blue-300/40 bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition hover:brightness-110"
                                    >
                                        Descargar Zoom
                                    </a>
                                    <button
                                        type="button"
                                        onClick={dismissZoomRecommendationBrowser}
                                        className="inline-flex min-h-[42px] min-w-[44px] items-center justify-center rounded-lg border border-slate-500/40 bg-slate-900/40 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400/50 hover:bg-slate-800/50"
                                    >
                                        Continuar con navegador
                                    </button>
                                    <button
                                        type="button"
                                        onClick={dismissZoomRecommendationPersistent}
                                        className="text-center text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-400 hover:underline sm:ml-auto"
                                    >
                                        Ya tengo Zoom instalado
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => void handleEnterLiveClass()}
                                disabled={loadingJoin}
                                className="w-full rounded-lg border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.3)] transition hover:brightness-110 disabled:opacity-70 sm:w-auto sm:min-w-[220px]"
                            >
                                {loadingJoin ? "Validando acceso..." : "Entrar a Clase en Vivo"}
                            </button>
                        </div>

                        {error ? (
                            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                                {error}
                            </p>
                        ) : null}

                        <div
                            className="mt-6 rounded-xl border border-blue-300/20 bg-[#040B18]/90 p-8 text-center shadow-[inset_0_1px_0_rgba(59,130,246,0.06)] sm:p-10"
                            aria-live="polite"
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-400/90">
                                Smart Option Academy
                            </p>
                            <h2 className="mt-3 text-lg font-bold leading-snug text-slate-100 sm:text-xl">
                                Tu acceso a la sesión estará disponible automáticamente
                            </h2>
                            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
                                Haz clic en &quot;Entrar a Clase en Vivo&quot; para validar tu acceso de forma segura y
                                conectarte a tu sesión premium.
                            </p>
                            <p className="mx-auto mt-4 max-w-lg text-xs leading-relaxed text-slate-500">
                                Recomendamos Zoom Desktop para la mejor experiencia, aunque también podrás acceder
                                mediante navegador.
                            </p>
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <section className="rounded-2xl border border-blue-300/20 bg-[#0B1220]/95 p-4 sm:p-5">
                            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-blue-300">
                                Recursos de la sesion
                            </h2>
                            <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                <li className="rounded-lg border border-slate-700/60 bg-[#0A1020] p-3">
                                    Checklist pre-mercado
                                </li>
                                <li className="rounded-lg border border-slate-700/60 bg-[#0A1020] p-3">
                                    Plan de riesgo intradia
                                </li>
                                <li className="rounded-lg border border-slate-700/60 bg-[#0A1020] p-3">
                                    Bitacora de ejecucion
                                </li>
                            </ul>
                        </section>

                        <section className="rounded-2xl border border-blue-300/20 bg-[#0B1220]/95 p-4 sm:p-5">
                            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-blue-300">
                                Recordatorio legal
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                Este programa es unicamente educativo y no representa asesoria financiera
                                personalizada. Invertir implica riesgos.
                            </p>
                            <Link href="/disclaimer" className="mt-3 inline-block text-sm font-semibold text-blue-300 hover:text-blue-200">
                                Ver disclaimer completo
                            </Link>
                        </section>
                    </aside>
                </div>
            </main>
            <SiteFooter />
        </div>
    )
}
