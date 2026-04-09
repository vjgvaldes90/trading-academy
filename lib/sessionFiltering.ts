import type { DbSession } from "./sessions"
import { parseYmdToLocal, sortSessionsForAgenda } from "./sessions"

function localDayStart(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

/** Monday 00:00 local (ISO week). */
function startOfIsoWeekMonday(ref: Date): Date {
    const d = localDayStart(ref)
    const dow = d.getDay()
    const diff = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + diff)
    return d
}

function addCalendarDays(d: Date, days: number): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    x.setDate(x.getDate() + days)
    x.setHours(0, 0, 0, 0)
    return x
}

function sessionLocalMidnight(session: DbSession): Date | null {
    const d = parseYmdToLocal(session.date)
    if (!d) return null
    d.setHours(0, 0, 0, 0)
    return d
}

/** Today onward (availability is controlled by capacity/bookings in UI/API). */
export function filterBookableSessionsFromToday(sessions: DbSession[], ref: Date): DbSession[] {
    const today0 = localDayStart(ref)
    const filtered = sessions.filter((s) => {
        const d = sessionLocalMidnight(s)
        if (!d) return false
        return d.getTime() >= today0.getTime()
    })
    return sortSessionsForAgenda(filtered)
}

export function getTodaySessions(sessions: DbSession[], ref: Date): DbSession[] {
    return sessions.filter((s) => {
        const d = sessionLocalMidnight(s)
        if (!d) return false
        return (
            d.getFullYear() === ref.getFullYear() &&
            d.getMonth() === ref.getMonth() &&
            d.getDate() === ref.getDate()
        )
    })
}

export function getWeekSessions(sessions: DbSession[], ref: Date): DbSession[] {
    const monday = startOfIsoWeekMonday(ref)
    const sunday = addCalendarDays(monday, 6)
    const startMs = monday.getTime()
    const endMs = sunday.getTime()
    return sessions.filter((s) => {
        const d = sessionLocalMidnight(s)
        if (!d) return false
        const t = d.getTime()
        return t >= startMs && t <= endMs
    })
}

export function getNextWeekSessions(sessions: DbSession[], ref: Date): DbSession[] {
    const monday = startOfIsoWeekMonday(ref)
    const nextMonday = addCalendarDays(monday, 7)
    const nextSunday = addCalendarDays(nextMonday, 6)
    const startMs = nextMonday.getTime()
    const endMs = nextSunday.getTime()
    return sessions.filter((s) => {
        const d = sessionLocalMidnight(s)
        if (!d) return false
        const t = d.getTime()
        return t >= startMs && t <= endMs
    })
}

// Backward-compatible aliases.
export const filterSessionsToday = getTodaySessions
export const filterSessionsThisCalendarWeek = getWeekSessions
export const filterSessionsNextCalendarWeek = getNextWeekSessions
