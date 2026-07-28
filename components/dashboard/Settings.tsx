"use client"

import { useLanguage } from "@/context/LanguageProvider"
import { CreditCard, LogOut, Shield } from "lucide-react"

export default function Settings({
    showCancelSubscription,
    subscriptionPendingCancel,
    onCancelSubscription,
    onLogout,
    isCancellingSubscription,
}: {
    showCancelSubscription: boolean
    subscriptionPendingCancel?: boolean
    onCancelSubscription: () => void
    onLogout: () => void
    isCancellingSubscription: boolean
}) {
    const { t } = useLanguage()

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">{t.settingsTitle}</h2>
                <p className="text-white/60 mt-1">{t.settingsSubtitle}</p>
            </header>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mt-0.5 rounded-lg bg-blue-600/15 border border-white/10 p-2 text-blue-300">
                        <Shield size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-extrabold text-slate-100 text-sm">{t.securityTitle}</div>
                        <p className="text-white/60 text-sm mt-1">{t.securityDescription}</p>
                    </div>
                </div>

                {subscriptionPendingCancel ? (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                        {t.subscriptionPendingCancel}
                    </div>
                ) : null}

                {showCancelSubscription ? (
                    <button
                        type="button"
                        disabled={isCancellingSubscription}
                        onClick={onCancelSubscription}
                        className="w-full flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-left transition hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="rounded-lg bg-red-500/15 border border-red-500/20 p-2 text-red-200">
                            <CreditCard size={18} />
                        </span>
                        <span className="min-w-0">
                            <span className="block font-extrabold text-red-200 text-sm">
                                {isCancellingSubscription ? t.cancellingSubscription : t.cancelSubscription}
                            </span>
                            <span className="block text-red-200/70 text-xs mt-0.5">{t.cancelSubscriptionHint}</span>
                        </span>
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-left transition hover:bg-white/10"
                >
                    <span className="rounded-lg bg-white/5 border border-white/10 p-2 text-slate-200">
                        <LogOut size={18} />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-extrabold text-slate-100 text-sm">{t.logout}</span>
                        <span className="block text-white/60 text-xs mt-0.5">{t.logoutHint}</span>
                    </span>
                </button>
            </section>
        </div>
    )
}
