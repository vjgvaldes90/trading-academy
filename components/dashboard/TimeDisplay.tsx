"use client"

import type { DbSession } from "@/lib/sessions"
import { getTimeDisplayParts } from "@/lib/sessions"

export type TimeDisplayVariant = "list" | "detail"

type TimeDisplayProps = {
    session: DbSession
    variant?: TimeDisplayVariant
    className?: string
}

/** Colores explícitos (evita heredar `body` oscuro en modo claro sobre fondos #020617). */
const clockClasses: Record<TimeDisplayVariant, string> = {
    list: "text-base font-semibold tabular-nums tracking-tight text-white leading-none",
    detail: "text-lg font-semibold tabular-nums tracking-tight text-white leading-none",
}

/**
 * Hora compacta: números en tabular-nums; AM/PM discreto (evita saltos con items-baseline + leading fijo).
 */
export default function TimeDisplay({ session, variant = "list", className = "" }: TimeDisplayProps) {
    const parts = getTimeDisplayParts(session)
    const rawTime = session.time?.trim()

    if (!parts) {
        return (
            <span
                className={`font-semibold tabular-nums text-gray-200 ${variant === "detail" ? "text-lg" : "text-base"} ${className}`}
            >
                {rawTime || "—"}
            </span>
        )
    }

    const { clock, period } = parts

    return (
        <div className={`flex shrink-0 items-baseline gap-1 ${className}`}>
            <span className={clockClasses[variant]}>{clock}</span>
            {period ? (
                <span className="text-xs font-medium tabular-nums leading-none text-gray-400">{period}</span>
            ) : null}
        </div>
    )
}
