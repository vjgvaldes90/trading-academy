"use client"

import { LogOut, Shield } from "lucide-react"
import { getAuthorizedAdminEmailAction } from "@/app/actions/admin"
import { useLanguage } from "@/context/LanguageProvider"
import { useEffect, useState } from "react"

export default function AdminSettings() {
    const { t } = useLanguage()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [adminEmail, setAdminEmail] = useState("")

    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const email = await getAuthorizedAdminEmailAction()
                if (!cancelled && email) setAdminEmail(email)
            } catch {
                // Keep the safe "—" fallback on transient failures.
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const handleLogout = async () => {
        if (busy) return
        setError(null)
        setBusy(true)
        try {
            const res = await fetch("/api/logout", {
                method: "POST",
                credentials: "include",
            })
            if (!res.ok) {
                throw new Error("logout_failed")
            }
            window.location.assign("/admin-login")
        } catch {
            setError(t.failedToLoad)
            setBusy(false)
        }
    }

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold text-slate-50">{t.adminSettings}</h2>
                <p className="mt-1 text-sm text-slate-400">{t.adminSettingsSubtitle}</p>
            </header>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-white/10 bg-blue-500/10 p-2 text-blue-300">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-extrabold text-slate-100">{t.adminSignedInContext}</p>
                        <p className="mt-1 text-sm text-slate-400">{t.adminCookieEmailNote}</p>
                        <p className="mt-2 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 font-mono text-sm text-slate-200">
                            {adminEmail || "—"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={busy}
                    className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span className="rounded-lg bg-white/5 border border-white/10 p-2 text-slate-200">
                        <LogOut className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-extrabold text-slate-100 text-sm">
                            {busy ? t.loading : t.logout}
                        </span>
                        <span className="block text-white/60 text-xs mt-0.5">{t.logoutHint}</span>
                    </span>
                </button>
                {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
        </div>
    )
}
