"use client"

export default function LoginInfo() {
    return (
        <div className="relative hidden overflow-hidden border-r border-blue-400/15 bg-[#020617]/90 p-12 text-white md:flex md:flex-col md:justify-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(59,130,246,0.28),transparent_42%),radial-gradient(circle_at_80%_82%,rgba(239,68,68,0.18),transparent_40%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:30px_30px] opacity-25" />

            <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                    Smart Option Academy
                </div>

                <h2 className="mb-6 text-4xl font-bold leading-tight text-slate-100">
                    Accede a mentoría institucional en tiempo real
                </h2>

                <p className="mb-8 text-slate-300">
                    Entra al ecosistema Smart Option Academy y opera con contexto profesional, estructura y gestión avanzada.
                </p>

                <ul className="space-y-3 text-slate-300">
                    <li>✔ Sesiones en vivo 3 veces por semana</li>
                    <li>✔ Análisis institucional y setups reales</li>
                    <li>✔ Trading en tiempo real con mentor</li>
                    <li>✔ Riesgo profesional y ejecución guiada</li>
                </ul>

                <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-3 text-xs backdrop-blur-xl">
                    <p className="font-semibold text-slate-200">LIVE MARKET ANALYSIS</p>
                    <div className="mt-2 flex gap-2 text-[11px]">
                        <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5">Forex</span>
                        <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5">Futuros</span>
                        <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5">Indices</span>
                    </div>
                </div>
            </div>
        </div>
    )
}