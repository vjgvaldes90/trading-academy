"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/context/SessionContext"
import { useBooking } from "@/hooks/useBooking"
import { hasReservationForSession } from "@/lib/studentReservations"
import {
    canShowStudentLiveJoinButton,
    DbSession,
    getSessionAvailableSeats,
    isStudentJoinTooEarly,
    isStudentSecureJoinWindowClosed,
    sessionDisplayDay,
    sessionDisplayHour,
} from "@/lib/sessions"

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
    if (isBookedByUser) return "Reservado"
    if (loading) return "Reservando..."
    if (blocked) return "Acceso no disponible"
    if (slotFull) return "Full"
    if (status === "success") return "Reservado"
    if (status === "error") return "Reintentar"
    return "Reservar cupo"
}

export default function SessionCard({ session, isUpdated = false }: SessionCardProps) {
    const { bookingAccess, userEmail, myBookings } = useSession()
    const router = useRouter()
    const now = new Date()
    const [joining, setJoining] = useState(false)

    const canBook = bookingAccess.canBook
    const bookedByUser = Boolean(session.isBookedByUser)
    const isBooked = Boolean(session.is_booked)
    const availableSlots = getSessionAvailableSeats(session)
    const hasReserved =
        bookedByUser || hasReservationForSession(myBookings, session.id, userEmail)
    const sessionFullForJoin = availableSlots <= 0 && !hasReserved
    const mayOpenLiveJoin = canShowStudentLiveJoinButton(session, now, {
        hasPaid: canBook,
        hasReservation: hasReserved,
    })
    const slotFullByCapacity = availableSlots === 0 && !bookedByUser
    const lockedOut =
        isBooked || !canBook || bookedByUser || slotFullByCapacity || !userEmail

    const { isLoading, status, bookSession } = useBooking()

    const capacity = session.max_slots ?? 0
    const timeLine = sessionDisplayHour(session) || "—"
    const dayLine = sessionDisplayDay(session)
    const dateLine = session.date ? `${dayLine} · ${session.date}` : dayLine

    const estado = bookedByUser
        ? {
              text: "Reservado",
              className: "bg-blue-500/20 text-blue-300 border border-blue-400/30",
          }
        : isBooked || slotFullByCapacity
          ? {
                text: "Lleno",
                className: "bg-red-500/20 text-red-300 border border-red-400/30",
            }
          : {
                text: "Disponible",
                className: "bg-green-500/20 text-green-300 border border-green-400/30",
            }

    const label = reserveLabel(
        bookedByUser,
        isBooked || slotFullByCapacity,
        !canBook,
        isLoading,
        status
    )
    const ctaDisabled = lockedOut || isLoading
    const retryable =
        status === "error" &&
        !isLoading &&
        !isBooked &&
        !slotFullByCapacity &&
        canBook &&
        !bookedByUser

    const cardSurface = bookedByUser
        ? "border border-blue-500/30 bg-gradient-to-br from-[#111827] to-[#0B0F1A] shadow-xl shadow-blue-500/10"
        : "border border-blue-500/20 bg-gradient-to-br from-[#111827] to-[#0B0F1A] shadow-xl shadow-blue-500/10"
    const spotsToneClass =
        availableSlots === 0 ? "text-red-500" : availableSlots <= 5 ? "text-yellow-400" : "text-green-400"

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
        canBook && hasReserved && isStudentSecureJoinWindowClosed(session, now) && !isStudentJoinTooEarly(session, now)

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
            className={`flex h-full min-h-[140px] flex-col gap-2 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] ${cardSurface}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white tabular-nums">{timeLine}</p>
                    <p className="text-xs text-gray-400">{dateLine}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${estado.className}`}
                    >
                        {estado.text}
                    </span>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                <span className={`text-xs tabular-nums ${spotsToneClass}`}>
                    {capacity > 0
                        ? availableSlots === 0
                            ? "Full"
                            : `${availableSlots} cupos disponibles`
                        : "—"}
                </span>
                <motion.button
                    type="button"
                    disabled={ctaDisabled}
                    whileTap={ctaDisabled ? {} : { scale: 0.97 }}
                    onClick={() =>
                        void bookSession(session.id, userEmail ?? "").catch(() => {})
                    }
                    className={[
                        "shrink-0 rounded-xl px-3 py-1 text-sm font-bold transition-all duration-200 active:scale-95",
                        bookedByUser
                            ? "cursor-not-allowed bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                            : retryable
                              ? "bg-[#EF4444] text-white hover:bg-red-500"
                              : isBooked || slotFullByCapacity
                                ? "cursor-not-allowed bg-gray-800 text-gray-500"
                                : ctaDisabled && !isLoading
                                  ? "cursor-not-allowed bg-gray-800 text-gray-500"
                                  : "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-blue-600",
                    ].join(" ")}
                >
                    {label}
                </motion.button>
            </div>
            <div className="mt-2 space-y-1">
                {!canBook ? (
                    <>
                        <p className="text-xs text-amber-200/90">Acceso no disponible</p>
                        <Link href="/pricing" className="text-xs font-bold text-blue-400 hover:text-blue-300">
                            Obtener acceso →
                        </Link>
                    </>
                ) : sessionFullForJoin ? (
                    <p className="text-xs font-semibold text-red-400">Sesión llena</p>
                ) : !hasReserved ? (
                    <p className="text-xs text-gray-400">Debes reservar esta sesión</p>
                ) : sessionClosed ? (
                    <p className="text-xs font-semibold text-slate-400">Sesión cerrada</p>
                ) : mayOpenLiveJoin ? (
                    <button
                        type="button"
                        disabled={joining}
                        onClick={() => void handleSecureJoin()}
                        className="inline-flex rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
                    >
                        {joining ? "Abriendo…" : "Unirse a la sesión en vivo"}
                    </button>
                ) : isStudentJoinTooEarly(session, now) ? (
                    <p className="text-xs text-gray-400">Disponible 10 minutos antes</p>
                ) : null}
            </div>
        </motion.div>
    )
}
