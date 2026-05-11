"use client"

import type { StudentDashboardView } from "@/components/student/Sidebar"
import { BookOpen, CalendarCheck, FileText, PlayCircle } from "lucide-react"

type QuickActionView = Extract<StudentDashboardView, "reserve" | "classes" | "my-reservations" | "resources">

const ACTIONS: {
    Icon: typeof BookOpen
    title: string
    description: string
    view: QuickActionView
}[] = [
    {
        Icon: BookOpen,
        title: "Reservar sesión",
        description: "Elige tu próxima clase",
        view: "reserve",
    },
    {
        Icon: PlayCircle,
        title: "Ver clases",
        description: "Continúa aprendiendo",
        view: "classes",
    },
    {
        Icon: CalendarCheck,
        title: "Mis reservas",
        description: "Revisa tus sesiones",
        view: "my-reservations",
    },
    {
        Icon: FileText,
        title: "Recursos",
        description: "Material complementario",
        view: "resources",
    },
]

export default function QuickActions({
    activeView,
    setActiveView,
}: {
    activeView: StudentDashboardView
    setActiveView: (view: StudentDashboardView) => void
}) {
    return (
        <div className="lg:col-span-2 rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
            <div className="text-slate-50 font-extrabold">Quick Actions</div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {ACTIONS.map(({ Icon, title, description, view }) => {
                    const isActive = activeView === view
                    return (
                        <button
                            key={view}
                            type="button"
                            onClick={() => setActiveView(view)}
                            className={[
                                "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-white/10",
                                "bg-white/5 p-6 text-center transition-all duration-200",
                                "hover:scale-[1.03] hover:border-blue-500/30 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
                                "active:scale-[0.98]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]",
                                isActive ? "border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/25" : "",
                            ].join(" ")}
                        >
                            <Icon
                                className="h-8 w-8 shrink-0 text-blue-400 transition-transform duration-200 group-hover:scale-110"
                                aria-hidden
                            />
                            <div className="flex min-h-0 w-full flex-col gap-1">
                                <span className="text-sm font-extrabold leading-snug text-slate-100">{title}</span>
                                <p className="m-0 text-center text-sm leading-snug text-slate-400">{description}</p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
