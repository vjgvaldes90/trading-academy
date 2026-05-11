"use client"

import { type ComponentType } from "react"
import {
    BarChart3,
    Calendar,
    CreditCard,
    LayoutDashboard,
    Settings as SettingsIcon,
    Users,
    Video,
} from "lucide-react"

export type AdminDashboardView =
    | "overview"
    | "classes"
    | "sessions"
    | "students"
    | "subscriptions"
    | "analytics"
    | "settings"

type NavItem = {
    label: string
    view: AdminDashboardView
    icon: ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
    { label: "Overview", view: "overview", icon: LayoutDashboard },
    { label: "Recorded Classes", view: "classes", icon: Video },
    { label: "Live Sessions", view: "sessions", icon: Calendar },
    { label: "Students", view: "students", icon: Users },
    { label: "Subscriptions", view: "subscriptions", icon: CreditCard },
    { label: "Analytics", view: "analytics", icon: BarChart3 },
    { label: "Settings", view: "settings", icon: SettingsIcon },
]

export default function AdminSidebar({
    activeView,
    setActiveView,
}: {
    activeView: AdminDashboardView
    setActiveView: (view: AdminDashboardView) => void
}) {
    const itemBase =
        "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition text-sm font-semibold text-left w-full"
    const itemActive = "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/25"
    const itemNormal = "text-slate-200 hover:bg-white/10"

    return (
        <aside
            className={[
                "hidden lg:flex",
                "fixed left-0 top-0 h-screen w-64",
                "bg-gradient-to-b from-[#0B1120] to-[#0A0F1C] border-r border-white/10",
                "flex-col p-4 gap-4",
                "z-40",
            ].join(" ")}
        >
            <div className="px-2 pt-1 pb-2 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-white/10 flex items-center justify-center text-amber-300">
                    <LayoutDashboard size={18} />
                </div>
                <div>
                    <div className="text-slate-50 font-extrabold text-[15px] tracking-tight">Admin</div>
                    <div className="text-white/60 text-xs mt-0.5">Trading Academy</div>
                </div>
            </div>

            <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = activeView === item.view
                    return (
                        <button
                            key={item.view}
                            type="button"
                            onClick={() => setActiveView(item.view)}
                            className={[itemBase, isActive ? itemActive : itemNormal].join(" ")}
                        >
                            <Icon size={18} className="opacity-80 shrink-0" />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            <div className="mt-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                Panel de control interno
            </div>
        </aside>
    )
}
