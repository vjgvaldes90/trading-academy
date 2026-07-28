"use client"

import { useState } from "react"
import { persistStudent, readStoredStudent } from "@/lib/studentLocalStorage"
import { useLanguage } from "@/context/LanguageProvider"

type CompleteProfileFormProps = {
    userEmail: string
}

export default function CompleteProfileForm({ userEmail }: CompleteProfileFormProps) {
    const { t } = useLanguage()
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phone, setPhone] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        const fn = firstName.trim()
        const ln = lastName.trim()
        const ph = phone.trim()
        if (!fn || !ln || !ph) {
            setError(t.completeProfileRequiredFields)
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/complete-profile", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName: fn, lastName: ln, phone: ph }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                const reason =
                    typeof (data as { reason?: unknown })?.reason === "string"
                        ? String((data as { reason: string }).reason)
                        : null
                if (res.status === 401) {
                    setError(t.mustSignInToContinue)
                    return
                }
                if (res.status === 403) {
                    if (reason === "inactive") setError(t.accessDeniedInactive)
                    else if (reason === "expired") setError(t.accessDeniedExpired)
                    else if (reason === "unpaid") setError(t.accessDeniedUnpaid)
                    else setError(t.accessDeniedNotFound)
                    return
                }
                if (res.status === 400) {
                    setError(t.completeProfileRequiredFields)
                    return
                }
                setError(t.completeProfileSaveError)
                return
            }
            console.log("✅ Profile saved")
            const fullName = [fn, ln].filter(Boolean).join(" ").trim()
            const existing = readStoredStudent()
            persistStudent({
                name: fullName || (userEmail.split("@")[0] ?? t.defaultStudentName),
                email: userEmail.trim().toLowerCase(),
                classes: existing?.classes ?? [],
            })
            window.location.assign("/dashboard")
        } catch {
            setError(t.completeProfileConnectionError)
        } finally {
            setLoading(false)
        }
    }

    const trimmedOk =
        firstName.trim().length > 0 && lastName.trim().length > 0 && phone.trim().length > 0

    return (
        <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-8 shadow-xl"
            style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
        >
            <h1 className="text-xl font-semibold text-white text-center mb-1">
                {t.completeProfileTitle}
            </h1>
            <p className="text-sm text-slate-400 text-center mb-8">
                {t.completeProfileSubtitle}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="firstName" className="block text-xs font-medium text-slate-400 mb-1.5">
                        {t.completeProfileFirstName}
                    </label>
                    <input
                        id="firstName"
                        type="text"
                        autoComplete="given-name"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder={t.completeProfileFirstNamePlaceholder}
                    />
                </div>
                <div>
                    <label htmlFor="lastName" className="block text-xs font-medium text-slate-400 mb-1.5">
                        {t.completeProfileLastName}
                    </label>
                    <input
                        id="lastName"
                        type="text"
                        autoComplete="family-name"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder={t.completeProfileLastNamePlaceholder}
                    />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-xs font-medium text-slate-400 mb-1.5">
                        {t.completeProfilePhone}
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder={t.completeProfilePhonePlaceholder}
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-400" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading || !trimmedOk}
                    className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                    {loading ? t.completeProfileSaving : t.completeProfileContinue}
                </button>
            </form>
        </div>
    )
}
