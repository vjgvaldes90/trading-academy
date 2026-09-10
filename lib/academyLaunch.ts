/**
 * Academy launch / pre-enrollment calendar gates (America/New_York).
 * Official payment activation starts at 2026-09-28 00:00:00 ET.
 * Client-safe (no Stripe imports).
 */

import { ET_TIME_ZONE, getEtYmd, zonedWallTimeToUtc } from "@/lib/etCalendar"

export const ACADEMY_LAUNCH_TIME_ZONE = ET_TIME_ZONE

/** First calendar day of official paid activation (America/New_York). */
export const ACADEMY_OFFICIAL_LAUNCH = {
    year: 2026,
    month: 9,
    day: 28,
} as const

/** Instant when official launch begins: 2026-09-28 00:00:00 America/New_York. */
export function getOfficialLaunchInstant(
    timeZone: string = ACADEMY_LAUNCH_TIME_ZONE
): Date {
    return zonedWallTimeToUtc(
        ACADEMY_OFFICIAL_LAUNCH.year,
        ACADEMY_OFFICIAL_LAUNCH.month,
        ACADEMY_OFFICIAL_LAUNCH.day,
        0,
        0,
        0,
        timeZone
    )
}

/** True when current time is on/after 2026-09-28 00:00 America/New_York. */
export function isOfficialLaunchStarted(now: Date = new Date()): boolean {
    return now.getTime() >= getOfficialLaunchInstant().getTime()
}

/**
 * Pre-enrollment window: before official launch instant
 * (through end of 2026-09-27 America/New_York).
 */
export function isPreEnrollmentOpen(now: Date = new Date()): boolean {
    return !isOfficialLaunchStarted(now)
}

/** Debug / logging: ET calendar Y-M-D for `now`. */
export function getAcademyLaunchCalendarYmd(now: Date = new Date()): {
    year: number
    month: number
    day: number
} {
    return getEtYmd(now, ACADEMY_LAUNCH_TIME_ZONE)
}
