"use client"

import { Shield } from "lucide-react"
import { useMemo } from "react"

export default function AdminSettings() {
    const adminEmail = useMemo(() => {
        if (typeof document === "undefined") return ""
        const key = "ta_student_email="
        const hit = document.cookie
            .split(";")
            .map((p) => p.trim())
            .find((p) => p.startsWith(key))
        if (!hit) return ""
        return decodeURIComponent(hit.slice(key.length)).trim()
    }, [])

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold text-slate-50">Settings</h2>
                <p className="mt-1 text-sm text-slate-400">Environment and session context for this admin panel.</p>
            </header>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-white/10 bg-blue-500/10 p-2 text-blue-300">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-extrabold text-slate-100">Signed-in context</p>
                        <p className="mt-1 text-sm text-slate-400">
                            Cookie email used for Zoom host actions and admin APIs:
                        </p>
                        <p className="mt-2 rounded-lg border border-white/10 bg-[#0f172a] px-3 py-2 font-mono text-sm text-slate-200">
                            {adminEmail || "—"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
