"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/context/LanguageProvider"

export default function Navbar() {
    const { t } = useLanguage()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <div
            className={`fixed top-0 left-0 z-50 w-full transition-all duration-300 ${
                scrolled
                    ? "border-b border-white/10 bg-[#020617]/90 shadow-lg backdrop-blur"
                    : "bg-transparent"
            }`}
        >
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div className="text-lg font-bold tracking-wide text-blue-400">
                    {t.smartOptionAcademy}
                </div>

                <div className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
                    <a
                        href="#how"
                        className="transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
                    >
                        {t.navHowItWorks}
                    </a>

                    <a
                        href="#pricing"
                        className="transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
                    >
                        {t.navPricing}
                    </a>
                </div>

                <a
                    href="#pricing"
                    className="rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] transition duration-200 hover:scale-[1.02] hover:border-blue-200/40 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                >
                    {t.navGetStarted}
                </a>
            </div>
        </div>
    )
}
