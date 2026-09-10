/**
 * America/New_York calendar helpers (Intl only — safe for client and server).
 */

export const ET_TIME_ZONE = "America/New_York"

type EtYmd = { year: number; month: number; day: number }

function getTimeZoneOffsetMs(at: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    })
    const parts = dtf.formatToParts(at)
    const pick = (type: string): number => {
        const value = parts.find((p) => p.type === type)?.value
        return Number(value ?? "0")
    }
    // hourCycle h23 can yield "24" in some engines for midnight — normalize.
    let h = pick("hour")
    if (h === 24) h = 0
    const asUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), h, pick("minute"), pick("second"), 0)
    return asUtc - at.getTime()
}

/** Wall-clock Y-M-D H:M:S in `timeZone` → UTC Date. */
export function zonedWallTimeToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    timeZone: string = ET_TIME_ZONE
): Date {
    const wallClockUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0)
    let utcMs = wallClockUtcMs
    for (let i = 0; i < 2; i++) {
        const offsetMs = getTimeZoneOffsetMs(new Date(utcMs), timeZone)
        utcMs = wallClockUtcMs - offsetMs
    }
    return new Date(utcMs)
}

export function getEtYmd(now: Date, timeZone: string = ET_TIME_ZONE): EtYmd {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
    const parts = dtf.formatToParts(now)
    const pick = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? "0")
    return { year: pick("year"), month: pick("month"), day: pick("day") }
}
