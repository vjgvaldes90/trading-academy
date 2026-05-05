"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

// IMPORTANT:
// Do NOT reserve seats here.
// Booking must happen only from the dashboard.

type PurchaseFormProps = {
    email: string
    setEmail: (value: string) => void
}

export default function PurchaseForm({ email, setEmail }: PurchaseFormProps) {
    const [payError, setPayError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false)

    const handlePay = async () => {
        setPayError(null)
        const em = email.trim()
        if (!em) {
            setPayError("Ingresa tu email")
            return
        }
        if (!acceptedDisclaimer) {
            setPayError("Debes confirmar el disclaimer educativo antes de continuar")
            return
        }
        setLoading(true)
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            const resCheckout = await fetch("/api/create-checkout", {
                method: "POST",
                cache: "no-store",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: em, userId: user?.id ?? null }),
            })

            if (!resCheckout.ok) {
                const checkoutJson = (await resCheckout.json().catch(() => ({}))) as { error?: string }
                const msg =
                    typeof checkoutJson.error === "string" && checkoutJson.error.trim()
                        ? checkoutJson.error
                        : "Error creando checkout"
                setPayError(msg)
                return
            }

            const data = (await resCheckout.json()) as { url?: string }
            if (data?.url) {
                window.location.href = data.url
            } else {
                setPayError("No se recibió la URL de pago")
            }
        } catch {
            setPayError("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <input
                type="email"
                placeholder="Ingresa tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-2 w-full rounded-lg border border-blue-400/30 bg-[#040B18] px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {payError ? <p className="text-sm text-red-600 mb-2">{payError}</p> : null}

            <label className="mb-3 flex items-start gap-2 rounded-lg border border-blue-300/20 bg-[#0A1020]/80 p-3 text-xs text-slate-300">
                <input
                    type="checkbox"
                    checked={acceptedDisclaimer}
                    onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-blue-300/40 bg-[#040B18] text-blue-500 focus:ring-blue-500"
                />
                <span>
                    Confirmo que entiendo que este programa es unicamente educativo y no representa asesoria
                    financiera personalizada.
                </span>
            </label>

            <button
                type="button"
                onClick={() => void handlePay()}
                disabled={loading || !acceptedDisclaimer}
                className="w-full rounded-lg border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 py-3 font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:opacity-60"
            >
                {loading ? "Procesando…" : "🚀 Comprar acceso ($150)"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400">
                Pago seguro • Acceso inmediato
            </p>
        </>
    )
}
