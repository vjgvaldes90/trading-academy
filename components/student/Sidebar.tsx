"use client"

import { type ComponentType, useEffect, useId, useState } from "react"
import {
    BookOpen,
    GraduationCap,
    Home,
    LifeBuoy,
    Megaphone,
    Menu,
    Settings as SettingsIcon,
    Video,
    X,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageProvider"

export type StudentDashboardView =
    | "dashboard"
    | "classes"
    | "live"
    | "resources"
    | "support"
    | "announcements"
    | "settings"

type NavItem = {
    label: string
    view: StudentDashboardView
    icon: ComponentType<{ size?: number; className?: string }>
}

function initialsFromName(name: string): string {
    const cleaned = name.trim()
    if (!cleaned) return "U"
    const parts = cleaned.split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? "U"
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""
    return (a + b).toUpperCase()
}

export default function Sidebar({
    userName,
    roleLabel,
    activeView,
    setActiveView,
    unreadAnnouncementsCount = 0,
}: {
    userName?: string
    roleLabel?: string
    activeView: StudentDashboardView
    setActiveView: (view: StudentDashboardView) => void
    unreadAnnouncementsCount?: number
}) {
    const { t } = useLanguage()
    const titleId = useId()
    const [mobileOpen, setMobileOpen] = useState(false)
    const displayName = userName?.trim() || t.defaultStudentName
    const displayRole = roleLabel ?? t.roleStudent

    const navItems: NavItem[] = [
        { label: t.navDashboard, view: "dashboard", icon: Home },
        { label: t.navMyClasses, view: "classes", icon: BookOpen },
        { label: t.navLiveSessions, view: "live", icon: Video },
        { label: t.navResources, view: "resources", icon: BookOpen },
        { label: t.navSupport, view: "support", icon: LifeBuoy },
        { label: t.navAnnouncements, view: "announcements", icon: Megaphone },
        { label: t.navSettings, view: "settings", icon: SettingsIcon },
    ]

    const itemBase =
        "flex min-h-[44px] items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition text-sm font-semibold text-left w-full"
    const itemActive = "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/25"
    const itemNormal = "text-slate-200 hover:bg-white/10"

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

    const selectView = (view: StudentDashboardView) => {
        setActiveView(view)
        setMobileOpen(false)
    }

    const renderNav = (onSelect: (view: StudentDashboardView) => void) =>
        navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.view
            const showBadge = item.view === "announcements" && unreadAnnouncementsCount > 0
            return (
                <button
                    key={item.view}
                    type="button"
                    onClick={() => onSelect(item.view)}
                    className={[itemBase, isActive ? itemActive : itemNormal].join(" ")}
                >
                    <Icon size={18} className={isActive ? "text-blue-400" : "text-slate-300"} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <AnimatePresence initial={false} mode="popLayout">
                        {showBadge ? (
                            <motion.span
                                key={unreadAnnouncementsCount}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white"
                            >
                                {unreadAnnouncementsCount > 99
                                    ? "99+"
                                    : unreadAnnouncementsCount}
                            </motion.span>
                        ) : null}
                    </AnimatePresence>
                </button>
            )
        })

    const brandHeader = (
        <div className="flex items-center gap-3 px-2 pt-1 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-blue-600/20 text-blue-300">
                <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
                <div className="truncate text-[15px] font-extrabold tracking-tight text-slate-50">
                    {t.tradingAcademy}
                </div>
                <div className="mt-0.5 truncate text-xs text-white/60">{t.smartOptionAcademy}</div>
            </div>
        </div>
    )

    const userCard = (
        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-blue-600/20 font-extrabold text-blue-200">
                    {initialsFromName(displayName)}
                </div>
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-100">{displayName}</div>
                    <div className="text-xs text-white/50">{displayRole}</div>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Mobile / tablet top bar */}
            <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0B1120]/95 px-3 py-2.5 backdrop-blur lg:hidden">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                        aria-expanded={mobileOpen}
                        aria-controls="student-mobile-nav"
                        aria-label={t.openNavigationMenu}
                    >
                        <Menu size={20} aria-hidden />
                    </button>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-50">
                            {t.tradingAcademy}
                        </div>
                        <div className="truncate text-[11px] text-white/55">{t.smartOptionAcademy}</div>
                    </div>
                </div>
            </div>

            {/* Mobile drawer */}
            <AnimatePresence>
                {mobileOpen ? (
                    <>
                        <motion.button
                            type="button"
                            key="student-nav-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="fixed inset-0 z-[55] bg-black/60 lg:hidden"
                            aria-label={t.closeNavigationMenu}
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            key="student-nav-drawer"
                            id="student-mobile-nav"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed left-0 top-0 z-[56] flex h-[100dvh] w-[min(18rem,88vw)] flex-col gap-4 border-r border-white/10 bg-gradient-to-b from-[#0B1120] to-[#0A0F1C] p-4 lg:hidden"
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
                            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                                {renderNav(selectView)}
                            </nav>
                            {userCard}
                        </motion.aside>
                    </>
                ) : null}
            </AnimatePresence>

            {/* Desktop sidebar (unchanged behavior ≥ lg) */}
            <aside
                className={[
                    "hidden lg:flex",
                    "fixed left-0 top-0 h-screen w-64",
                    "bg-gradient-to-b from-[#0B1120] to-[#0A0F1C] border-r border-white/10",
                    "flex-col p-4 gap-4",
                    "z-40",
                ].join(" ")}
            >
                {brandHeader}
                <nav className="flex flex-col gap-1">{renderNav(setActiveView)}</nav>
                {userCard}
            </aside>
        </>
    )
}
