"use client"

import { useState } from "react"

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

    const handlePay = async () => {
        setPayError(null)
        const em = email.trim()
        if (!em) {
            setPayError("Ingresa tu email")
            return
        }
        setLoading(true)
        try {
            const resCheckout = await fetch("/api/create-checkout", {
                method: "POST",
                cache: "no-store",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: em }),
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
        } catch (e) {
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
                className="w-full px-4 py-3 mb-2 border border-gray-300 rounded-lg 
          placeholder-gray-500 text-gray-900 
          focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {payError ? <p className="text-sm text-red-600 mb-2">{payError}</p> : null}

            <button
                type="button"
                onClick={() => void handlePay()}
                disabled={loading}
                className="w-full bg-green-500 text-black py-3 rounded-lg font-bold hover:bg-green-400 transition disabled:opacity-60"
            >
                {loading ? "Procesando…" : "🚀 Comprar acceso ($150)"}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
                Pago seguro • Acceso inmediato
            </p>
        </>
    )
}
