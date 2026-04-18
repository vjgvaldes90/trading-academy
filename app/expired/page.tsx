import Link from "next/link"

export default function ExpiredAccessPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Smart Option Academy
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Tu acceso ha caducado</h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
                Renueva tu suscripción para seguir usando el dashboard y reservar sesiones. Si acabas de
                pagar, espera unos segundos e intenta de nuevo.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#020617] transition hover:bg-emerald-400"
                >
                    Ver planes y renovar
                </Link>
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/60"
                >
                    Ir al login
                </Link>
            </div>
        </div>
    )
}
