"use client"

import BookSessionSection from "@/components/dashboard/focused/BookSessionSection"

export default function ReserveSession() {
    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">Reservar Sesión</h2>
                <p className="text-white/60 mt-1">Reserva tu próxima clase en vivo.</p>
            </header>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                <BookSessionSection />
            </section>
        </div>
    )
}
