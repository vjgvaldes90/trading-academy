"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageProvider"

type MarketItem = {
    symbol: string
    name: string
    price: string
    changePct: string
    direction: "up" | "down"
}

/** Static mock quotes for visual polish only — no live market feed. */
const MARKET_ITEMS: MarketItem[] = [
    {
        symbol: "SPX",
        name: "S&P 500",
        price: "7,658.70",
        changePct: "+0.42%",
        direction: "up",
    },
    {
        symbol: "NDX",
        name: "NASDAQ",
        price: "21,482.15",
        changePct: "+0.67%",
        direction: "up",
    },
    {
        symbol: "DJI",
        name: "DOW JONES",
        price: "53,420.08",
        changePct: "+0.36%",
        direction: "up",
    },
    {
        symbol: "BTC",
        name: "BITCOIN",
        price: "$78,880",
        changePct: "+1.48%",
        direction: "up",
    },
    {
        symbol: "XAU",
        name: "GOLD",
        price: "$4,634",
        changePct: "+0.60%",
        direction: "up",
    },
    {
        symbol: "XAG",
        name: "SILVER",
        price: "$68.47",
        changePct: "-0.71%",
        direction: "down",
    },
    {
        symbol: "WTI",
        name: "CRUDE OIL",
        price: "$85.18",
        changePct: "-1.67%",
        direction: "down",
    },
]

function TickerItem({ item }: { item: MarketItem }) {
    const isUp = item.direction === "up"
    return (
        <div className="flex shrink-0 items-center gap-3 px-5 sm:gap-3.5 sm:px-6">
            <span
                className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold leading-none",
                    isUp
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300",
                ].join(" ")}
                aria-hidden
            >
                {isUp ? "▲" : "▼"}
            </span>
            <div className="flex items-baseline gap-2.5 sm:gap-3">
                <span className="text-[11px] font-extrabold tracking-[0.12em] text-slate-200 sm:text-xs">
                    {item.name}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-400 sm:text-xs">
                    {item.price}
                </span>
                <span
                    className={[
                        "font-mono text-[11px] font-semibold tabular-nums sm:text-xs",
                        isUp ? "text-emerald-400" : "text-rose-400",
                    ].join(" ")}
                >
                    {item.changePct}
                </span>
            </div>
            <span className="h-3 w-px bg-white/10" aria-hidden />
        </div>
    )
}

function TickerTrack({ items, trackId }: { items: MarketItem[]; trackId: string }) {
    return (
        <div className="flex shrink-0 items-center" aria-hidden={trackId !== "a"}>
            {items.map((item) => (
                <TickerItem key={`${trackId}-${item.symbol}`} item={item} />
            ))}
        </div>
    )
}

/**
 * Visual-only market ticker for the landing page.
 * Uses static mock data — no APIs or live feeds.
 * Fixed to the viewport bottom so ticker + disclaimer stay visible while scrolling.
 */
export default function MarketTicker() {
    const { t } = useLanguage()

    return (
        <>
            {/* Reserves document flow height equal to the fixed bar (ticker + disclaimer). */}
            <div
                className="pointer-events-none h-[7.25rem] sm:h-[5.25rem]"
                aria-hidden
            />

            <section
                aria-label="Market ticker"
                className="fixed bottom-0 left-0 right-0 z-40 bg-[#020617]"
            >
                <div className="relative overflow-hidden border-y border-white/10 bg-[#070B14]">
                    <div
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#070B14] to-transparent sm:w-16"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#070B14] to-transparent sm:w-16"
                        aria-hidden
                    />

                    <div className="soa-market-ticker flex h-10 items-center sm:h-11">
                        <TickerTrack items={MARKET_ITEMS} trackId="a" />
                        <TickerTrack items={MARKET_ITEMS} trackId="b" />
                    </div>
                </div>

                {/* Reuses existing legal copy + disclaimer link — no new legal wording. */}
                <div className="border-b border-white/5 bg-[#050914] px-4 py-2.5 sm:px-6">
                    <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                        <p className="text-[10px] leading-relaxed text-slate-500 sm:text-[11px]">
                            {t.importantDisclaimerText}
                        </p>
                        <Link
                            href="/disclaimer"
                            className="shrink-0 text-[10px] font-semibold text-slate-400 underline-offset-2 transition hover:text-blue-300 hover:underline sm:text-[11px]"
                        >
                            {t.importantDisclaimerLink}
                        </Link>
                    </div>
                </div>

                <style jsx>{`
                    .soa-market-ticker {
                        width: max-content;
                        animation: soaMarketTickerScroll 42s linear infinite;
                        will-change: transform;
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .soa-market-ticker {
                            animation: none;
                        }
                    }

                    @keyframes soaMarketTickerScroll {
                        from {
                            transform: translateX(0);
                        }
                        to {
                            transform: translateX(-50%);
                        }
                    }
                `}</style>
            </section>
        </>
    )
}

