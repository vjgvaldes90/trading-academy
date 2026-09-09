"use client"

import type { InputHTMLAttributes } from "react"
import { CalendarDays, Clock3 } from "lucide-react"

type SupportedType = "date" | "time"

type DateTimeFieldProps = {
    label: string
    helperText?: string | null
    timePreviewTimezoneLabel?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
        type: SupportedType
    }

function toAmPmEt(value: string): string | null {
    const m = /^(\d{2}):(\d{2})$/.exec(value.trim())
    if (!m) return null

    const hours24 = Number(m[1])
    const minutes = m[2]
    if (!Number.isFinite(hours24) || hours24 < 0 || hours24 > 23) return null

    const suffix = hours24 >= 12 ? "PM" : "AM"
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
    return `${String(hours12).padStart(2, "0")}:${minutes} ${suffix}`
}

export default function DateTimeField({
    label,
    helperText,
    timePreviewTimezoneLabel = "ET",
    type,
    id,
    className,
    value,
    ...inputProps
}: DateTimeFieldProps) {
    const isTime = type === "time"
    const Icon = isTime ? Clock3 : CalendarDays
    const valueAsString = typeof value === "string" ? value : ""
    const timePreview = isTime && valueAsString ? toAmPmEt(valueAsString) : null

    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
                {label}
            </label>

            <div className="group relative">
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-amber-300"
                >
                    <Icon className="h-4.5 w-4.5" />
                </span>

                <input
                    id={id}
                    type={type}
                    value={value}
                    className={`h-11 w-full rounded-xl border border-white/12 bg-[#0f172a] pl-10 pr-3 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition [color-scheme:dark] placeholder:text-slate-600 hover:border-white/20 focus:border-amber-300/55 focus:outline-none focus:ring-2 focus:ring-amber-400/30 disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:hover:opacity-100 ${className ?? ""}`}
                    {...inputProps}
                />
            </div>

            {isTime && timePreview ? (
                <p className="mt-1.5 text-[11px] font-medium tracking-wide text-amber-300/90">
                    {timePreview} · {timePreviewTimezoneLabel}
                </p>
            ) : null}

            {!isTime && helperText ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{helperText}</p>
            ) : null}
        </div>
    )
}
