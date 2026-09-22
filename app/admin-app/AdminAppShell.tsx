"use client"

import { useLanguage } from "@/context/LanguageProvider"
import {
    BookOpen,
    Calendar,
    ChevronRight,
    Headset,
    LifeBuoy,
    UserPlus,
    Users,
    Wrench,
    type LucideIcon,
} from "lucide-react"
import Link from "next/link"

type ModuleCard = {
    id: string
    title: string
    description: string
    Icon: LucideIcon
    accent: "blue" | "amber"
    href?: string
}

export default function AdminAppShell({ adminEmail }: { adminEmail: string }) {
    const { t } = useLanguage()

    const modules: ModuleCard[] = [
        {
            id: "enrollments",
            title: t.adminAppSectionEnrollments,
            description: t.adminAppEnrollmentsSubtitle,
            Icon: UserPlus,
            accent: "amber",
            href: "/admin-app/enrollments",
        },
        {
            id: "support",
            title: t.adminSupport,
            description: t.adminAppSupportSubtitle,
            Icon: LifeBuoy,
            accent: "blue",
            href: "/admin-app/support",
        },
        {
            id: "private-classes",
            title: t.adminPrivateClassRequests,
            description: t.adminPrivateClassSubtitle,
            Icon: BookOpen,
            accent: "blue",
            href: "/admin-app/private-classes",
        },
        {
            id: "sessions",
            title: t.adminLiveSessions,
            description: t.adminSessionsSubtitle,
            Icon: Calendar,
            accent: "blue",
            href: "/admin-app/trading-sessions",
        },
        {
            id: "students",
            title: t.adminStudents,
            description: t.adminStudentsSubtitle,
            Icon: Users,
            accent: "blue",
            href: "/admin-app/students",
        },
        {
            id: "it-tools",
            title: t.adminAppSectionItTools,
            description: t.adminAppItToolsSubtitle,
            Icon: Wrench,
            accent: "amber",
            href: "/admin-app/it-tools",
        },
    ]

    return (
        <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.22),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,0.14),transparent_36%)]"
            />

            <header className="relative z-10 mb-6 pr-[5.5rem]">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-300">
                        <Headset className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-white">
                            {t.adminAppName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{t.adminAppTagline}</p>
                    </div>
                </div>
            </header>

            <section className="relative z-10 mb-5">
                <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-white">
                    {t.welcome} {t.adminLabel}
                </h1>
                <p className="mt-1.5 truncate text-sm text-slate-400">{adminEmail}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.adminAppSubtitle}</p>
            </section>

            <section className="relative z-10 grid grid-cols-1 gap-3">
                {modules.map(({ id, title, description, Icon, accent, href }) => {
                    const className = [
                        "flex w-full items-center gap-3 rounded-2xl border bg-[#111827]/95 p-4 text-left transition",
                        accent === "amber" ? "border-amber-400/25" : "border-white/[0.08]",
                        href ? "active:bg-white/[0.04]" : "",
                    ].join(" ")

                    const body = (
                        <>
                            <span
                                className={[
                                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                                    accent === "amber"
                                        ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
                                        : "border-blue-400/25 bg-blue-500/15 text-blue-300",
                                ].join(" ")}
                            >
                                <Icon className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">{title}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                            </div>
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-600">
                                <ChevronRight className="h-4 w-4" aria-hidden />
                            </span>
                        </>
                    )

                    if (href) {
                        return (
                            <Link key={id} href={href} className={className}>
                                {body}
                            </Link>
                        )
                    }

                    return (
                        <div key={id} className={className}>
                            {body}
                        </div>
                    )
                })}
            </section>

            <nav
                className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.08] bg-[#0B0F19]/95 backdrop-blur-md"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                aria-label={t.adminAppNavHome}
            >
                <div className="mx-auto flex max-w-lg items-stretch gap-1 px-3 py-2">
                    <Link
                        href="/admin-app"
                        className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-blue-600/20 px-2 py-2.5 text-blue-200"
                    >
                        <span className="text-[11px] font-semibold">{t.adminAppNavHome}</span>
                    </Link>
                    <Link
                        href="/admin"
                        className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-slate-400 transition active:bg-white/[0.04]"
                    >
                        <span className="text-[11px] font-semibold">{t.adminAppNavWebPanel}</span>
                    </Link>
                </div>
            </nav>
        </div>
    )
}
