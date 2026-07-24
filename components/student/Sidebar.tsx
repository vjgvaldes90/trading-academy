"use client"

import { type ComponentType } from "react"
import { BookOpen, GraduationCap, Home, Settings as SettingsIcon, Video } from "lucide-react"

export type StudentDashboardView =
    | "dashboard"
    | "classes"
    | "live"
    | "resources"
    | "settings"

type NavItem = {
    label: string
    view: StudentDashboardView
    icon: ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", view: "dashboard", icon: Home },
    { label: "Mis Clases", view: "classes", icon: BookOpen },
    { label: "Sesiones en vivo", view: "live", icon: Video },
    { label: "Recursos", view: "resources", icon: BookOpen },
    { label: "Configuración", view: "settings", icon: SettingsIcon },
]

function initialsFromName(name: string): string {
    const cleaned = name.trim()
    if (!cleaned) return "U"
    const parts = cleaned.split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? "U"
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
    return (a + b).toUpperCase()
}

export default function Sidebar({
    userName = "Student",
    roleLabel = "Alumno",
    activeView,
    setActiveView,
}: {
    userName?: string
    roleLabel?: string
    activeView: StudentDashboardView
    setActiveView: (view: StudentDashboardView) => void
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
                <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-white/10 flex items-center justify-center text-blue-300">
                    <GraduationCap size={18} />
                </div>
                <div>
                    <div className="text-slate-50 font-extrabold text-[15px] tracking-tight">Trading Academy</div>
                    <div className="text-white/60 text-xs mt-0.5">Smart Option Academy</div>
                </div>
            </div>

            <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = activeView === item.view
                    return (
                        <button
                            key={item.label}
                            type="button"
                            onClick={() => setActiveView(item.view)}
                            className={[itemBase, isActive ? itemActive : itemNormal].join(" ")}
                        >
                            <Icon size={18} className={isActive ? "text-blue-400" : "text-slate-300"} />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600/20 border border-white/10 flex items-center justify-center text-blue-200 font-extrabold">
                        {initialsFromName(userName)}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-100">{userName}</div>
                        <div className="text-xs text-white/50">{roleLabel}</div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
