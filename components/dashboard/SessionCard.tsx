"use client"

import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import { useSession } from "@/context/SessionContext"
import { useBooking } from "@/hooks/useBooking"
import { getAvailabilityTone } from "@/lib/sessionAvailability"
import { DbSession, formatTimeLabel, getSessionMeta, weekdayLabel } from "@/lib/sessions"

type SessionCardProps = {
    session: DbSession
    isUpdated?: boolean
}

function reserveLabel(
    isBookedByUser: boolean,
    slotFull: boolean,
    blocked: boolean,
    loading: boolean,
    status: "idle" | "success" | "error"
): string {
    if (isBookedByUser) return "Reservado ✅"
    if (loading) return "Reservando..."
    if (blocked) return "Sin acceso"
    if (slotFull) return "Lleno"
    if (status === "success") return "Reservado ✅"
    if (status === "error") return "Reintentar"
    return "Reservar cupo"
}

export default function SessionCard({ session, isUpdated = false }: SessionCardProps) {
    const { bookingAccess } = useSession()
    const canBook = bookingAccess.canBook
    const bookedByUser = Boolean(session.isBookedByUser)
    const meta = getSessionMeta(session)
    const tone = getAvailabilityTone(meta.available)
    const slotFull = meta.isFull
    const lockedOut = slotFull || !canBook || bookedByUser

    const [reservedToast, setReservedToast] = useState(false)
    const showReservedToast = useCallback(() => setReservedToast(true), [])

    const { isLoading, status, message, bookSession } = useBooking(session, lockedOut, {
        onReserved: showReservedToast,
    })

    useEffect(() => {
        if (!reservedToast) return
        const id = window.setTimeout(() => setReservedToast(false), 3200)
        return () => window.clearTimeout(id)
    }, [reservedToast])

    const maxSlots = session.max_slots ?? 0
    const timeLine = formatTimeLabel(session) || "—"
    const dayLine = session.day?.trim() || weekdayLabel(session)
    const dateLine = session.date ? `${dayLine} - ${session.date}` : dayLine

    const estado = bookedByUser
        ? { text: "Tu cupo", className: "text-emerald-400" }
        : slotFull
          ? { text: "Lleno", className: "text-red-400" }
          : tone === "low"
            ? { text: "Pocos cupos", className: "text-amber-400" }
            : { text: "Disponible", className: "text-green-400" }

    const label = reserveLabel(bookedByUser, slotFull, !canBook, isLoading, status)
    const ctaDisabled = lockedOut || isLoading
    const retryable = status === "error" && !isLoading && !slotFull && canBook && !bookedByUser

    const cardSurface = bookedByUser
        ? "border-emerald-500/45 bg-emerald-950/20 opacity-[0.92] shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
        : "border-white/10 bg-[#0e1628] opacity-100 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"

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
            whileHover={{ y: -3, transition: { duration: 0.18, ease: "easeOut" } }}
            className={`flex h-full min-h-[140px] flex-col gap-2 rounded-xl border p-4 transition-colors duration-200 ${cardSurface}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white tabular-nums">{timeLine}</p>
                    <p className="text-xs text-gray-400">{dateLine}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    {bookedByUser ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                            Ya estás dentro
                        </span>
                    ) : null}
                    <span className={`text-xs font-semibold ${estado.className}`}>{estado.text}</span>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                <span className="text-xs tabular-nums text-gray-400">
                    {maxSlots > 0 ? `${meta.available}/${maxSlots} cupos` : "—"}
                </span>
                <motion.button
                    type="button"
                    disabled={ctaDisabled}
                    whileTap={ctaDisabled ? {} : { scale: 0.97 }}
                    onClick={() => void bookSession()}
                    className={[
                        "shrink-0 rounded-lg px-3 py-1 text-sm font-bold transition-colors duration-200",
                        bookedByUser
                            ? "cursor-not-allowed bg-green-600 text-white"
                            : retryable
                              ? "bg-red-600 text-white hover:bg-red-500"
                              : ctaDisabled && !isLoading
                                ? "cursor-not-allowed bg-slate-700/80 text-slate-500"
                                : "bg-blue-600 text-white hover:bg-blue-500",
                    ].join(" ")}
                >
                    {label}
                </motion.button>
            </div>

            <AnimatePresence>
                {reservedToast ? (
                    <motion.p
                        key="toast"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="text-center text-xs font-bold text-emerald-400"
                    >
                        Cupo reservado correctamente
                    </motion.p>
                ) : null}
            </AnimatePresence>

            {!canBook ? (
                <Link href="/#pricing" className="text-xs font-bold text-blue-400 hover:text-blue-300">
                    Comprar acceso →
                </Link>
            ) : null}

            {message && canBook && !bookedByUser ? (
                <p className="text-[11px] font-semibold leading-snug text-red-300">{message}</p>
            ) : null}
        </motion.div>
    )
}
