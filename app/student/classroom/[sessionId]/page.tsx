"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import Navbar from "@/components/landing/Navbar"
import SiteFooter from "@/components/shared/SiteFooter"
import { fetchSecureStudentJoinUrl } from "@/lib/secureJoinClient"
import { resolveDashboardStudent } from "@/lib/studentLocalStorage"
import { canRenderZoomIframe, ZOOM_CLASSROOM_PROVIDER } from "@/lib/zoomClassroom"

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
    const [sessionPreview, setSessionPreview] = useState<SessionPreview | null>(null)
    const [joinUrl, setJoinUrl] = useState<string>("")
    const [loadingJoin, setLoadingJoin] = useState(false)
    const [error, setError] = useState<string>("")

    useEffect(() => {
        const student = resolveDashboardStudent()
        if (!student?.email) {
            router.replace(`/login?redirect=${encodeURIComponent(`/student/classroom/${sessionId}`)}`)
            return
        }
        setStudentEmail(student.email.trim().toLowerCase())
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

    const prepareJoin = async () => {
        if (!studentEmail || !sessionId || loadingJoin) return
        setError("")
        setLoadingJoin(true)
        try {
            const result = await fetchSecureStudentJoinUrl(sessionId, studentEmail)
            if (!result.ok) {
                setError(result.message)
                return
            }
            setJoinUrl(result.join_url)
        } finally {
            setLoadingJoin(false)
        }
    }

    const handleEnterLiveClass = async () => {
        if (loadingJoin) return
        let url = joinUrl
        if (!url) {
            await prepareJoin()
            url = joinUrl
        }
        if (!url && studentEmail && sessionId) {
            const result = await fetchSecureStudentJoinUrl(sessionId, studentEmail)
            if (!result.ok) {
                setError(result.message)
                return
            }
            url = result.join_url
            setJoinUrl(result.join_url)
        }
        if (url) {
            window.location.href = url
        }
    }

    useEffect(() => {
        if (!studentEmail || !sessionId) return
        void prepareJoin()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentEmail, sessionId])

    const canEmbed = useMemo(() => {
        if (!joinUrl) return false
        if (ZOOM_CLASSROOM_PROVIDER !== "browser-join") return false
        return canRenderZoomIframe(joinUrl)
    }, [joinUrl])

    return (
        <div className="min-h-screen bg-[#020617] text-white">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-28 sm:px-6">
                <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
                    <section className="rounded-2xl border border-blue-300/20 bg-[#0B1220]/95 p-4 shadow-[0_20px_52px_rgba(2,6,23,0.55)] sm:p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                            Aula del estudiante
                        </p>
                        <h1 className="mt-2 text-2xl font-bold text-slate-100 sm:text-3xl">{sessionTitle}</h1>
                        {scheduleLine ? <p className="mt-1 text-sm text-slate-400">{scheduleLine}</p> : null}

                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => void handleEnterLiveClass()}
                                disabled={loadingJoin}
                                className="rounded-lg border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-70"
                            >
                                {loadingJoin ? "Validando acceso..." : "Entrar a Clase en Vivo"}
                            </button>
                            <Link
                                href="/dashboard"
                                className="rounded-lg border border-slate-500/30 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-400/40 hover:text-slate-200"
                            >
                                Volver al dashboard
                            </Link>
                        </div>

                        {error ? (
                            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                                {error}
                            </p>
                        ) : null}

                        <div className="mt-5 overflow-hidden rounded-xl border border-blue-300/15 bg-[#040B18]">
                            {canEmbed ? (
                                <iframe
                                    title="Zoom classroom session"
                                    src={joinUrl}
                                    className="h-[58vh] min-h-[420px] w-full"
                                    allow="camera; microphone; fullscreen; display-capture"
                                />
                            ) : (
                                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
                                    <p className="max-w-xl text-sm text-slate-300">
                                        Tu clase se abrira dentro de la plataforma cuando Zoom permita la vista
                                        embebida. Si no esta disponible, usa el boton de acceso para continuar sin
                                        friccion.
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Usa el boton principal para entrar. El sistema valida tu acceso automaticamente.
                                    </p>
                                </div>
                            )}
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
