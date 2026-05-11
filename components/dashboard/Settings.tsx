"use client"

import { CreditCard, LogOut, Shield } from "lucide-react"

export default function Settings({
    showCancelSubscription,
    onCancelSubscription,
    onLogout,
    isCancellingSubscription,
}: {
    showCancelSubscription: boolean
    onCancelSubscription: () => void
    onLogout: () => void
    isCancellingSubscription: boolean
}) {
    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-xl font-semibold">Configuración</h2>
                <p className="text-white/60 mt-1">Cuenta, suscripción y sesión.</p>
            </header>

            <section className="rounded-2xl p-6 bg-[#111827] border border-white/10 shadow-sm space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="mt-0.5 rounded-lg bg-blue-600/15 border border-white/10 p-2 text-blue-300">
                        <Shield size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-extrabold text-slate-100 text-sm">Seguridad</div>
                        <p className="text-white/60 text-sm mt-1">
                            Cierra sesión en este dispositivo cuando termines.
                        </p>
                    </div>
                </div>

                {showCancelSubscription ? (
                    <button
                        type="button"
                        disabled={isCancellingSubscription}
                        onClick={onCancelSubscription}
                        className="w-full flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-left transition hover:bg-red-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="rounded-lg bg-red-500/15 border border-red-500/20 p-2 text-red-200">
                            <CreditCard size={18} />
                        </span>
                        <span className="min-w-0">
                            <span className="block font-extrabold text-red-200 text-sm">
                                {isCancellingSubscription ? "Cancelando…" : "Cancelar suscripción"}
                            </span>
                            <span className="block text-red-200/70 text-xs mt-0.5">
                                Perderás el acceso al contenido de la academia.
                            </span>
                        </span>
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-left transition hover:bg-white/10"
                >
                    <span className="rounded-lg bg-white/5 border border-white/10 p-2 text-slate-200">
                        <LogOut size={18} />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-extrabold text-slate-100 text-sm">Cerrar sesión</span>
                        <span className="block text-white/60 text-xs mt-0.5">Volverás a la pantalla de acceso.</span>
                    </span>
                </button>
            </section>
        </div>
    )
}
