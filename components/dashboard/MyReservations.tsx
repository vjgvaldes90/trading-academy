"use client"

import MyBookingsSection from "@/components/dashboard/focused/MyBookingsSection"

export default function MyReservations() {
    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">Mis Reservas</h2>
                <p className="text-white/60 mt-1">Revisa tus sesiones reservadas.</p>
            </header>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm">
                <MyBookingsSection />
            </section>
        </div>
    )
}
