"use client"

export default function TradingActivity({ compact }: { compact?: boolean }) {
    const bars = [
        { h: 14, d: "0ms" },
        { h: 28, d: "120ms" },
        { h: 18, d: "240ms" },
        { h: 36, d: "60ms" },
        { h: 22, d: "180ms" },
        { h: 40, d: "300ms" },
        { h: 16, d: "90ms" },
        { h: 30, d: "210ms" },
        { h: 20, d: "330ms" },
        { h: 34, d: "150ms" },
        { h: 24, d: "270ms" },
        { h: 38, d: "30ms" },
    ]

    return (
        <div
            aria-hidden="true"
            style={{
                marginTop: compact ? 14 : 18,
                position: "relative",
                height: compact ? 70 : 86,
                borderRadius: 16,
                overflow: "hidden",
                background:
                    "linear-gradient(180deg, rgba(37,99,235,0.08) 0%, rgba(16,185,129,0.03) 55%, rgba(2,6,23,0) 100%)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
                opacity: 0.85,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "radial-gradient(80% 60% at 50% 20%, rgba(37,99,235,0.18) 0%, rgba(16,185,129,0.10) 45%, rgba(2,6,23,0) 70%)",
                    animation: "tradingGlow 3200ms ease-in-out infinite",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    padding: "14px 16px",
                    opacity: 0.9,
                }}
            >
                {bars.map((b, idx) => (
                    <div
                        key={idx}
                        style={{
                            width: 10,
                            height: b.h,
                            borderRadius: 999,
                            background:
                                idx % 3 === 0
                                    ? "linear-gradient(180deg, rgba(37,99,235,0.0) 0%, rgba(37,99,235,0.55) 55%, rgba(37,99,235,0.10) 100%)"
                                    : "linear-gradient(180deg, rgba(16,185,129,0.0) 0%, rgba(16,185,129,0.55) 55%, rgba(16,185,129,0.10) 100%)",
                            boxShadow:
                                idx % 3 === 0
                                    ? "0 10px 28px rgba(37,99,235,0.22)"
                                    : "0 10px 28px rgba(16,185,129,0.16)",
                            animation: "volumePulse 1200ms ease-in-out infinite",
                            animationDelay: b.d,
                            transformOrigin: "bottom",
                        }}
                    />
                ))}
            </div>
            <div
                style={{
                    position: "absolute",
                    left: 14,
                    top: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "rgba(226,232,240,0.70)",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    textTransform: "uppercase",
                }}
            >
                Actividad del mercado
                <span style={{ color: "rgba(148,163,184,0.70)", fontWeight: 800, textTransform: "none" }}>
                    · baja liquidez
                </span>
            </div>
        </div>
    )
}
