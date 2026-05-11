"use client"

import { BarChart3, LineChart, PieChart } from "lucide-react"

export default function AdminAnalytics() {
    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold text-slate-50">Analytics</h2>
                <p className="mt-1 text-sm text-slate-400">
                    Deeper reporting will plug in here (retention, attendance, revenue).
                </p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                    { Icon: BarChart3, title: "Session fill rate", hint: "Coming soon" },
                    { Icon: LineChart, title: "Active learners", hint: "Coming soon" },
                    { Icon: PieChart, title: "Plan mix", hint: "Coming soon" },
                ].map(({ Icon, title, hint }) => (
                    <div
                        key={title}
                        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-6"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-blue-500/10 text-blue-300">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-extrabold text-slate-100">{title}</p>
                            <p className="mt-1 text-sm text-slate-500">{hint}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
