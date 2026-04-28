"use client"

import { useState, useEffect } from "react"

export default function Navbar() {
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
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled
                    ? "bg-[#020617]/90 backdrop-blur border-b border-white/10 shadow-lg"
                    : "bg-transparent"
                }`}
        >
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

                {/* 🔥 LOGO */}
                <div className="text-white font-bold text-lg tracking-wide">
                    Smart Option <span className="text-blue-400">Academy</span>
                </div>

                {/* 🧭 LINKS */}
                <div className="hidden md:flex items-center gap-8 text-gray-300 text-sm">

                    <a
                        href="#how"
                        className="hover:text-white transition"
                    >
                        Cómo funciona
                    </a>

                    <a
                        href="#pricing"
                        className="hover:text-white transition"
                    >
                        Precio
                    </a>

                </div>

                {/* 💰 CTA */}
                <a
                    href="/login"
                    className="rounded-lg border border-blue-300/30 bg-gradient-to-r from-blue-500 to-blue-700 px-5 py-2 font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)] transition hover:brightness-110 hover:scale-105"
                >
                    Empezar
                </a>

            </div>
        </div>
    )
}