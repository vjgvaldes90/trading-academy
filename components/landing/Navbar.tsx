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
                    Smart Option <span className="text-green-400">Academy</span>
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
                    className="bg-green-500 text-black px-5 py-2 rounded-lg font-semibold hover:bg-green-400 transition transform hover:scale-105"
                >
                    Empezar
                </a>

            </div>
        </div>
    )
}