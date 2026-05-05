import Link from "next/link"
import Navbar from "@/components/landing/Navbar"
import SiteFooter from "@/components/shared/SiteFooter"

export default function DisclaimerPage() {
    return (
        <div className="min-h-screen bg-[#020617] text-white">
            <Navbar />
            <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-32 sm:px-8">
                <section className="rounded-2xl border border-blue-300/20 bg-[#0B1220]/95 p-6 shadow-[0_20px_52px_rgba(2,6,23,0.55)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Aviso Legal</p>
                    <h1 className="mt-3 text-3xl font-bold text-slate-100 sm:text-4xl">Disclaimer Legal</h1>
                    <p className="mt-6 text-base leading-relaxed text-slate-300">
                        Este curso tiene fines exclusivamente educativos y no constituye asesoria financiera
                        personalizada. Invertir en los mercados financieros implica riesgos. Cada persona es
                        responsable de sus decisiones de inversion.
                    </p>
                    <Link
                        href="/"
                        className="mt-8 inline-flex rounded-lg border border-blue-300/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/25 hover:text-blue-100"
                    >
                        Volver al inicio
                    </Link>
                </section>
            </main>
            <SiteFooter />
        </div>
    )
}
