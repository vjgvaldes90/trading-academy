"use client"

export default function TradingActivity({ compact }: { compact?: boolean }) {
    const minHeight = compact ? 220 : 380

    return (
        <section
            aria-label="Live trading class preview"
            className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#06080D] shadow-[0_35px_85px_rgba(0,0,0,0.65)] transition-transform duration-300 hover:scale-[1.01]"
            style={{ marginTop: compact ? 14 : 20, minHeight }}
        >
            <div className="pointer-events-none absolute inset-0 animate-[borderGlow_4.8s_ease-in-out_infinite] rounded-[24px] border border-red-500/25" />

            <video
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/images/trading-class-preview-poster.jpg"
                aria-hidden="true"
            >
                <source src="/videos/trading-class-preview.mp4" type="video/mp4" />
            </video>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/88 via-black/52 to-black/72" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(239,68,68,0.24),transparent_45%),radial-gradient(circle_at_90%_85%,rgba(37,99,235,0.10),transparent_45%)]" />

            <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 md:p-8">
                <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-red-100 backdrop-blur-md sm:text-xs">
                        <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.95)]" />
                        LIVE CLASS
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-100 backdrop-blur-xl sm:text-xs">
                        500+ Active Students
                    </div>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div className="max-w-[620px] space-y-2 sm:space-y-3">
                        <h3 className="text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
                            Institutional Trading Sessions
                        </h3>
                        <p className="text-sm text-slate-200/95 sm:text-base">
                            Real mentorship, live classes, and professional strategies
                        </p>
                    </div>

                    <div className="pointer-events-auto shrink-0">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(220,38,38,0.45)] transition-all duration-300 hover:brightness-110 sm:px-5"
                        >
                            Watch Preview
                        </button>
                    </div>
                </div>
            </div>

            <noscript>
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "linear-gradient(135deg, rgba(2,6,23,0.9), rgba(15,23,42,0.92)), url('/images/trading-class-preview-poster.jpg') center/cover no-repeat",
                    }}
                />
            </noscript>

            {!compact ? (
                <div className="pointer-events-none absolute right-6 top-1/2 hidden w-[210px] -translate-y-1/2 rounded-2xl border border-white/15 bg-white/10 p-3 text-slate-100 backdrop-blur-xl lg:block">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-300">
                        Session Analytics
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                        <p className="flex items-center justify-between">
                            <span className="text-slate-300">Win-Rate Focus</span>
                            <span className="font-semibold text-emerald-300">62%</span>
                        </p>
                        <p className="flex items-center justify-between">
                            <span className="text-slate-300">Live Mentoring</span>
                            <span className="font-semibold text-red-300">Now</span>
                        </p>
                    </div>
                </div>
            ) : null}

            <style jsx>{`
                @keyframes borderGlow {
                    0%,
                    100% {
                        box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.25), 0 0 26px rgba(239, 68, 68, 0.1);
                    }
                    50% {
                        box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.5), 0 0 42px rgba(239, 68, 68, 0.24);
                    }
                }
            `}</style>
        </section>
    )
}
