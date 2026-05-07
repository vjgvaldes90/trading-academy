"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"

type Props = {
    queryError: string | null
}

export default function AdminLoginClient({ queryError }: Props) {
    const [email, setEmail] = useState("")
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setMessage(null)
        setBusy(true)
        try {
            const normalizedEmail = email.trim().toLowerCase()
            const res = await fetch("/api/admin/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail }),
            })
            const payload = (await res.json().catch(() => ({}))) as {
                error?: string
                ok?: unknown
                redirect?: string
            }
            if (!res.ok || payload.ok !== true) {
                throw new Error(
                    typeof payload.error === "string" && payload.error.trim()
                        ? payload.error
                        : "Could not complete admin login"
                )
            }
            const target =
                typeof payload.redirect === "string" && payload.redirect.startsWith("/")
                    ? payload.redirect
                    : "/admin"
            window.location.assign(target)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not complete admin login")
        } finally {
            setBusy(false)
        }
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.34),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(250,204,21,0.2),transparent_42%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />

            <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
                <section className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-950/70 p-8 shadow-[0_30px_80px_-35px_rgba(59,130,246,0.6)] backdrop-blur">
                    <div className="mb-7">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/90">
                            Smart Option Academy
                        </p>
                        <h1 className="mt-2 text-2xl font-extrabold text-slate-50">Corporate Admin Login</h1>
                        <p className="mt-2 text-sm text-slate-400">
                            Access is restricted to authorized corporate admin accounts.
                        </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <label className="block space-y-2">
                            <span className="text-sm font-semibold text-slate-200">Corporate email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                                placeholder="name@smartoptionacademy.com"
                                autoComplete="email"
                                required
                                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/35"
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:from-blue-400 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {busy ? "Signing in..." : "Sign in to admin dashboard"}
                        </button>
                    </form>

                    {queryError ? <p className="mt-4 text-sm text-rose-300">{queryError}</p> : null}
                    {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
                    {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}

                    <div className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-400">
                        Student access remains available via{" "}
                        <Link href="/login" className="font-semibold text-blue-300 hover:text-blue-200">
                            student login
                        </Link>
                        .
                    </div>
                </section>
            </div>
        </main>
    )
}
