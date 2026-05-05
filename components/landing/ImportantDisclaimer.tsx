"use client"

import { ShieldCheck } from "lucide-react"
import Link from "next/link"

export default function ImportantDisclaimer() {
    return (
        <section className="bg-[#020617] px-6 pb-12 pt-4 text-white">
            <div className="mx-auto w-full max-w-6xl rounded-2xl border border-blue-300/20 bg-gradient-to-br from-[#0B1220]/95 to-[#0A1020]/95 p-6 shadow-[0_18px_44px_rgba(2,6,23,0.55)] sm:p-8">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl border border-blue-300/25 bg-blue-500/10 p-2.5 text-blue-200">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">Disclaimer Importante</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                            Este curso tiene fines exclusivamente educativos y no constituye asesoria financiera
                            personalizada. Invertir implica riesgos.
                        </p>
                        <Link
                            href="/disclaimer"
                            className="mt-4 inline-flex rounded-lg border border-blue-300/25 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/25 hover:text-blue-100"
                        >
                            Leer disclaimer completo
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
