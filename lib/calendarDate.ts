/**
 * Calendar dates (YYYY-MM-DD) such as lessons.class_date: a day on the calendar, not an instant.
 * Never pass them through the browser's time zone, or users west of UTC see the previous day.
 */

import type { Language } from "@/lib/i18n"

const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** True for a real calendar day in strict YYYY-MM-DD form (rejects e.g. 2026-02-30). */
export function isCalendarDate(value: string): boolean {
    const m = CALENDAR_DATE_RE.exec(value)
    if (!m) return false
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    const d = new Date(Date.UTC(year, month - 1, day))
    return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}

/**
 * Normalize an API value to YYYY-MM-DD.
 * Also accepts the legacy timestamptz form ("2026-10-07T00:00:00+00:00"), whose rows were all
 * stored at midnight UTC, so its first 10 characters are the intended day.
 */
export function toCalendarDate(value: string | null | undefined): string | null {
    if (typeof value !== "string") return null
    const ymd = value.trim().slice(0, 10)
    return isCalendarDate(ymd) ? ymd : null
}

/** e.g. "7 oct 2026" (ES) / "Oct 7, 2026" (EN); "" when the value is not a calendar date. */
export function formatCalendarDate(value: string | null | undefined, language: Language): string {
    const ymd = toCalendarDate(value)
    if (!ymd) return ""
    const [year, month, day] = ymd.split("-").map(Number)
    return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)))
}
