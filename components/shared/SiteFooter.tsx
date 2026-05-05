"use client"

import Link from "next/link"

export default function SiteFooter() {
    return (
        <footer className="border-t border-blue-400/15 bg-[#020617] py-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
                <p className="text-sm text-slate-500">© 2026 Smart Option Academy. Todos los derechos reservados.</p>
                <Link
                    href="/disclaimer"
                    className="text-sm font-semibold text-blue-300 transition hover:text-blue-200"
                >
                    Disclaimer Legal
                </Link>
            </div>
        </footer>
    )
}
