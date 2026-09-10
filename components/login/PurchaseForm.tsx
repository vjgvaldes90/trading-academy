"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { isPreEnrollmentOpen } from "@/lib/academyLaunch"
import { useLanguage } from "@/context/LanguageProvider"

// IMPORTANT:
// Do NOT create live-session reservations here.
// Live join happens only from the dashboard via secure join.

export type CheckoutPlanId = "trading_only" | "full_program"

type PurchaseFormProps = {
    email: string
    setEmail: (value: string) => void
    /** From `/login?plan=…` — defaults to trading_only (legacy) */
    plan?: CheckoutPlanId
    /** After pre-enroll: fill Access tab with the issued code. */
    onPreEnrolled?: (accessCode: string) => void
}

export default function PurchaseForm({
    email,
    setEmail,
    plan = "trading_only",
    onPreEnrolled,
}: PurchaseFormProps) {
    const { t } = useLanguage()
    const [payError, setPayError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false)
    const [issuedAccessCode, setIssuedAccessCode] = useState<string | null>(null)
    const preEnrollmentOpen = isPreEnrollmentOpen()

    const checkoutPlan: CheckoutPlanId =
        plan === "full_program" ? "full_program" : "trading_only"

    const runStripeCheckout = async (em: string) => {
        const {
            data: { user },
        } = await supabase.auth.getUser()
        const resCheckout = await fetch("/api/create-checkout", {
            method: "POST",
            cache: "no-store",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: em,
                userId: user?.id ?? null,
                plan: checkoutPlan,
            }),
        })

        if (!resCheckout.ok) {
            const checkoutJson = (await resCheckout.json().catch(() => ({}))) as {
                error?: string
            }
            const msg =
                typeof checkoutJson.error === "string" && checkoutJson.error.trim()
                    ? checkoutJson.error
                    : t.purchaseCheckoutError
            setPayError(msg)
            return
        }

        const data = (await resCheckout.json()) as { url?: string }
        if (data?.url) {
            window.location.href = data.url
        } else {
            setPayError(t.purchaseNoPaymentUrl)
        }
    }

    const handlePay = async () => {
        setPayError(null)
        const em = email.trim()
        if (!em) {
            setPayError(t.purchaseEmailRequired)
            return
        }
        if (!acceptedDisclaimer) {
            setPayError(t.purchaseDisclaimerRequired)
            return
        }
        setLoading(true)
        try {
            // UX gate via academyLaunch; server /api/pre-enroll remains authoritative.
            if (preEnrollmentOpen) {
                const resPre = await fetch("/api/pre-enroll", {
                    method: "POST",
                    cache: "no-store",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: em,
                        plan: checkoutPlan,
                    }),
                })
                const preJson = (await resPre.json().catch(() => ({}))) as {
                    ok?: unknown
                    code?: string
                    error?: string
                    accessCode?: string
                    alreadyRegistered?: boolean
                }

                if (preJson.code === "pre_enrollment_closed") {
                    await runStripeCheckout(em)
                    return
                }

                if (!resPre.ok || preJson.ok !== true) {
                    const msg =
                        typeof preJson.error === "string" && preJson.error.trim()
                            ? preJson.error
                            : t.purchasePreEnrollError
                    setPayError(msg)
                    return
                }

                const code =
                    typeof preJson.accessCode === "string" ? preJson.accessCode.trim() : ""
                if (!code) {
                    setPayError(t.purchasePreEnrollError)
                    return
                }

                setIssuedAccessCode(code)
                return
            }

            await runStripeCheckout(em)
        } catch {
            setPayError(t.purchaseConnectionError)
        } finally {
            setLoading(false)
        }
    }

    if (issuedAccessCode) {
        return (
            <>
                <p className="mb-3 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                    {t.purchasePreEnrollSuccess}
                </p>
                <p className="mb-2 text-center text-xs uppercase tracking-wide text-slate-400">
                    {t.accessCodeLabel}
                </p>
                <p className="mb-4 select-all rounded-lg border border-blue-400/30 bg-[#040B18] px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-white">
                    {issuedAccessCode}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        onPreEnrolled?.(issuedAccessCode)
                    }}
                    className="w-full rounded-lg border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 py-3 font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.32)] transition hover:brightness-110"
                >
                    {t.purchasePreEnrollGoToAccess}
                </button>
                <p className="mt-3 text-center text-xs text-slate-400">
                    {t.purchasePreEnrollFootnote}
                </p>
            </>
        )
    }

    return (
        <>
            {(() => {
                const planLabel = preEnrollmentOpen
                    ? checkoutPlan === "full_program"
                        ? t.purchasePreEnrollPlanFullProgramLabel
                        : t.purchasePreEnrollPlanTradingOnlyLabel
                    : checkoutPlan === "full_program"
                      ? t.purchasePlanFullProgramLabel
                      : t.purchasePlanTradingOnlyLabel
                if (!planLabel.trim()) return null
                return (
                    <p className="mb-3 rounded-lg border border-blue-300/20 bg-[#0A1020]/80 px-3 py-2 text-xs text-slate-300">
                        {planLabel}
                    </p>
                )
            })()}

            <input
                type="email"
                placeholder={t.purchaseEmailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-2 w-full rounded-lg border border-blue-400/30 bg-[#040B18] px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {payError ? <p className="mb-2 text-sm text-red-600">{payError}</p> : null}

            <label className="mb-3 flex items-start gap-2 rounded-lg border border-blue-300/20 bg-[#0A1020]/80 p-3 text-xs text-slate-300">
                <input
                    type="checkbox"
                    checked={acceptedDisclaimer}
                    onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-blue-300/40 bg-[#040B18] text-blue-500 focus:ring-blue-500"
                />
                <span>{t.purchaseDisclaimerCheckbox}</span>
            </label>

            <button
                type="button"
                onClick={() => void handlePay()}
                disabled={loading || !acceptedDisclaimer}
                aria-busy={loading}
                className="w-full rounded-lg border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 py-3 font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:opacity-60"
            >
                {loading
                    ? t.purchaseProcessing
                    : preEnrollmentOpen
                      ? checkoutPlan === "full_program"
                          ? t.purchasePreEnrollFullProgram
                          : t.purchasePreEnrollTradingOnly
                      : checkoutPlan === "full_program"
                        ? t.purchaseBuyFullProgram
                        : t.purchaseBuyTradingOnly}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400">
                {preEnrollmentOpen ? t.purchasePreEnrollSecureNote : t.purchaseSecurePayment}
            </p>
        </>
    )
}
