"use client"

import { useLanguage } from "@/context/LanguageProvider"
import type { TranslationKeys } from "@/lib/i18n/en"
import { AnimatePresence, motion } from "framer-motion"
import { type ComponentType, useEffect, useId, useMemo, useState } from "react"
import {
    BarChart3,
    Calendar,
    ClipboardList,
    CreditCard,
    LayoutDashboard,
    LifeBuoy,
    Megaphone,
    Menu,
    Settings as SettingsIcon,
    UserRound,
    Users,
    Video,
    X,
} from "lucide-react"

export type AdminDashboardView =
    | "overview"
    | "classes"
    | "sessions"
    | "theoryPlanning"
    | "privateClasses"
    | "students"
    | "subscriptions"
    | "support"
    | "announcements"
    | "analytics"
    | "settings"

type NavItem = {
    labelKey: keyof TranslationKeys
    view: AdminDashboardView
    icon: ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
    { labelKey: "adminOverview", view: "overview", icon: LayoutDashboard },
    { labelKey: "adminRecordedClasses", view: "classes", icon: Video },
    { labelKey: "adminLiveSessions", view: "sessions", icon: Calendar },
    { labelKey: "adminTheoryPlanning", view: "theoryPlanning", icon: ClipboardList },
    { labelKey: "adminPrivateClassRequests", view: "privateClasses", icon: UserRound },
    { labelKey: "adminStudents", view: "students", icon: Users },
    { labelKey: "adminSubscriptions", view: "subscriptions", icon: CreditCard },
    { labelKey: "adminSupport", view: "support", icon: LifeBuoy },
    { labelKey: "adminAnnouncements", view: "announcements", icon: Megaphone },
    { labelKey: "adminAnalytics", view: "analytics", icon: BarChart3 },
    { labelKey: "adminSettings", view: "settings", icon: SettingsIcon },
]

export default function AdminSidebar({
    activeView,
    setActiveView,
    openSupportCount = 0,
}: {
    activeView: AdminDashboardView
    setActiveView: (view: AdminDashboardView) => void
    openSupportCount?: number
}) {
    const { t } = useLanguage()
    const titleId = useId()
    const [mobileOpen, setMobileOpen] = useState(false)

    const navLabels = useMemo(
        () =>
            NAV_ITEMS.map((item) => ({
                ...item,
                label: t[item.labelKey],
            })),
        [t]
    )

    const itemBase =
        "flex min-h-[42px] items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition duration-200 text-sm font-medium text-left w-full"
    const itemActive = "bg-blue-600/25 text-white"
    const itemNormal = "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"

    useEffect(() => {
        if (!mobileOpen) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMobileOpen(false)
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [mobileOpen])

    const selectView = (view: AdminDashboardView) => {
        setActiveView(view)
        setMobileOpen(false)
    }

    const renderNav = (onSelect: (view: AdminDashboardView) => void) =>
        navLabels.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.view
            const showBadge = item.view === "support" && openSupportCount > 0
            return (
                <button
                    key={item.view}
                    type="button"
                    onClick={() => onSelect(item.view)}
                    className={[itemBase, isActive ? itemActive : itemNormal].join(" ")}
                >
                    <Icon
                        size={18}
                        className={["shrink-0", isActive ? "text-blue-300" : "opacity-70"].join(" ")}
                    />
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    {showBadge ? (
                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">
                            {openSupportCount > 99 ? "99+" : openSupportCount}
                        </span>
                    ) : null}
                </button>
            )
        })

    const brandHeader = (
        <div className="px-1 pb-3 pt-2">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-500/15 text-amber-300">
                    <BarChart3 size={20} aria-hidden />
                </div>
                <div className="min-w-0">
                    <div className="truncate text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
                        {t.smartOptionAcademy}
                    </div>
                </div>
            </div>
        </div>
    )

    const brandFooter = (
        <div className="mt-auto border-t border-white/[0.06] px-1 pt-4">
            <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-400/25 bg-amber-500/10 text-amber-300">
                    <BarChart3 size={14} aria-hidden />
                </div>
                <div className="min-w-0">
                    <div className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-300">
                        {t.smartOptionAcademy}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-slate-500">{t.adminInternalPanel}</div>
                </div>
            </div>
        </div>
    )

    return (
        <>
            <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0B0F19]/95 px-3 py-2.5 backdrop-blur lg:hidden">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                        aria-expanded={mobileOpen}
                        aria-controls="admin-mobile-nav"
                        aria-label={t.openNavigationMenu}
                    >
                        <Menu size={20} aria-hidden />
                    </button>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold uppercase tracking-wide text-slate-50">
                            {t.smartOptionAcademy}
                        </div>
                        <div className="truncate text-[11px] text-white/55">{t.adminLabel}</div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {mobileOpen ? (
                    <>
                        <motion.button
                            type="button"
                            key="admin-nav-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="fixed inset-0 z-[55] bg-black/60 lg:hidden"
                            aria-label={t.closeNavigationMenu}
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            key="admin-nav-drawer"
                            id="admin-mobile-nav"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed left-0 top-0 z-[56] flex h-[100dvh] w-[min(17.5rem,88vw)] flex-col gap-3 border-r border-white/[0.07] bg-[#0B0F19] p-4 lg:hidden"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div id={titleId} className="min-w-0">
                                    {brandHeader}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                                    aria-label={t.closeNavigationMenu}
                                >
                                    <X size={18} aria-hidden />
                                </button>
                            </div>
                            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                                {renderNav(selectView)}
                            </nav>
                            {brandFooter}
                        </motion.aside>
                    </>
                ) : null}
            </AnimatePresence>

            <aside
                className={[
                    "hidden lg:flex",
                    "fixed left-0 top-0 h-screen w-[15.5rem]",
                    "bg-[#0B0F19] border-r border-white/[0.07]",
                    "flex-col p-4 gap-3",
                    "z-40",
                ].join(" ")}
            >
                {brandHeader}
                <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                    {renderNav(setActiveView)}
                </nav>
                {brandFooter}
            </aside>
        </>
    )
}
