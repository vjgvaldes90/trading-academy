"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/context/SessionContext"
import {
    canShowStudentLiveJoinButton,
    DbSession,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
} from "@/lib/sessions"

type SessionCardProps = {
    session: DbSession
    isUpdated?: boolean
}

export default function SessionCard({ session, isUpdated = false }: SessionCardProps) {
    const { academyAccess, userEmail } = useSession()
    const router = useRouter()
    const now = new Date()
    const [joining, setJoining] = useState(false)

    const canAccess = academyAccess.canAccess
    const mayOpenLiveJoin = canShowStudentLiveJoinButton(session, now, {
        hasPaid: canAccess,
    })

    const timeLine = sessionDisplayHour(session) || "—"
    const dayLine = sessionDisplayDay(session)
    const dateLine = session.date ? `${dayLine} · ${session.date}` : dayLine

    const handleSecureJoin = async () => {
        if (!userEmail || joining) return
        setJoining(true)
        try {
            router.push(`/student/classroom/${session.id}`)
        } finally {
            setJoining(false)
        }
    }

    const sessionClosed =
        canAccess && isStudentSecureJoinWindowClosed(session, now) && !isStudentJoinTooEarly(session, now)

    return (
        <motion.div
            animate={
                isUpdated
                    ? {
                          boxShadow: [
                              "0 0 0 1px rgba(59,130,246,0.25)",
                              "0 0 0 1px rgba(96,165,250,0.5)",
                              "0 0 0 1px rgba(59,130,246,0.25)",
                          ],
                      }
                    : {}
            }
            transition={{ duration: 0.45, ease: "easeInOut" }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
            className="flex h-full min-h-[140px] flex-col gap-2 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#111827] to-[#0B0F1A] p-4 shadow-xl shadow-blue-500/10 transition-all duration-200 hover:scale-[1.02]"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white tabular-nums">{timeLine}</p>
                    <p className="text-xs text-gray-400">{dateLine}</p>
                </div>
                <span className="rounded-full border border-green-400/30 bg-green-500/20 px-2 py-1 text-xs font-semibold text-green-300">
                    Disponible
                </span>
            </div>

            <div className="mt-auto space-y-2 border-t border-white/5 pt-2">
                {!canAccess ? (
                    <>
                        <p className="text-xs text-amber-200/90">Acceso no disponible</p>
                        <Link href="/pricing" className="text-xs font-bold text-blue-400 hover:text-blue-300">
                            Obtener acceso →
                        </Link>
                    </>
                ) : sessionClosed ? (
                    <p className="text-xs font-semibold text-slate-400">Sesión cerrada</p>
                ) : mayOpenLiveJoin ? (
                    <button
                        type="button"
                        disabled={joining}
                        onClick={() => void handleSecureJoin()}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
                    >
                        {joining ? "Abriendo…" : "Join Live Session"}
                    </button>
                ) : isStudentJoinTooEarly(session, now) ? (
                    <p className="text-xs text-gray-400">Disponible 10 minutos antes</p>
                ) : (
                    <p className="text-xs font-semibold text-green-400">Live Session</p>
                )}
            </div>
        </motion.div>
    )
}
