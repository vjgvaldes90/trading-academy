/**
 * Full Program class cycles (public landing display only).
 * Cycles start every FULL_PROGRAM_CYCLE_INTERVAL_DAYS from the base date, in America/New_York.
 */

import { ET_TIME_ZONE, getEtYmd } from "@/lib/etCalendar"
import type { Language } from "@/lib/i18n"

export const FULL_PROGRAM_CYCLE_BASE_YMD = "2026-10-08"
export const FULL_PROGRAM_CYCLE_INTERVAL_DAYS = 14

const DAY_MS = 86_400_000

function pad2(n: number): string {
    return String(n).padStart(2, "0")
}

function ymdToUtcMs(ymd: string): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
    if (!m) return Number.NaN
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function utcMsToYmd(ms: number): string {
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

/** Today's calendar date in America/New_York as YYYY-MM-DD. */
export function getEtTodayYmd(now: Date = new Date()): string {
    const { year, month, day } = getEtYmd(now, ET_TIME_ZONE)
    return `${year}-${pad2(month)}-${pad2(day)}`
}

/**
 * First cycle start on or after `todayYmd` (a cycle starting today is still shown).
 * Before the base date → base date.
 */
export function getNextFullProgramCycleYmd(todayYmd: string): string {
    const base = ymdToUtcMs(FULL_PROGRAM_CYCLE_BASE_YMD)
    const today = ymdToUtcMs(todayYmd)
    if (!Number.isFinite(today) || today <= base) return FULL_PROGRAM_CYCLE_BASE_YMD
    const intervalMs = FULL_PROGRAM_CYCLE_INTERVAL_DAYS * DAY_MS
    const steps = Math.ceil((today - base) / intervalMs)
    return utcMsToYmd(base + steps * intervalMs)
}

function intlLocale(language: Language): string {
    return language === "es" ? "es-ES" : "en-US"
}

/** Compact badge, e.g. "08 OCT" (EN) / "08 OCT" (ES), "05 NOV", "06 ENE". */
export function formatCycleBadge(ymd: string, language: Language): string {
    const ms = ymdToUtcMs(ymd)
    if (!Number.isFinite(ms)) return ""
    const d = new Date(ms)
    const month = new Intl.DateTimeFormat(intlLocale(language), { month: "short", timeZone: "UTC" })
        .format(d)
        .replace(/\./g, "")
        .slice(0, 3)
        .toUpperCase()
    return `${pad2(d.getUTCDate())} ${month}`
}

/** Long day + month, e.g. "October 8" (EN) / "8 de octubre" (ES). */
export function formatCycleLongDate(ymd: string, language: Language): string {
    const ms = ymdToUtcMs(ymd)
    if (!Number.isFinite(ms)) return ""
    return new Intl.DateTimeFormat(intlLocale(language), {
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    }).format(new Date(ms))
}
