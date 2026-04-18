export type DbSession = {
    id: string
    /** Display label (e.g. weekday name); not used for filtering. */
    day: string | null
    /** Canonical session calendar date (YYYY-MM-DD), maps from `session_date`. */
    date: string | null
    /** Display time label; maps from `session_hour`. */
    time: string | null
    max_slots: number | null
    booked_slots: number | null
    /** Backend-computed real-time availability from /api/sessions. */
    available_spots?: number | null
    link: string | null
    /** Row closed / not offered; excluded from booking lists. */
    is_booked?: boolean
    /** Cupo reservado por el usuario actual (hydrate en dashboard + tras reserva en cliente). */
    isBookedByUser?: boolean
}

export type SessionStatus = "live" | "today" | "next"

const LIVE_WINDOW_MINUTES = 10

const SPANISH_WEEKDAYS = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
]

export function parseTimeToMinutes(time: string): number | null {
    const t = time.trim()
    const m24 = /^(\d{1,2}):(\d{2})(?::\d{1,2})?$/.exec(t)
    if (m24) {
        const h = Number(m24[1])
        const min = Number(m24[2])
        if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return h * 60 + min
    }

    const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t)
    if (m12) {
        let h = Number(m12[1])
        const min = Number(m12[2])
        const ampm = m12[3].toUpperCase()
        if (h < 1 || h > 12 || min < 0 || min > 59) return null
        if (ampm === "PM" && h !== 12) h += 12
        if (ampm === "AM" && h === 12) h = 0
        return h * 60 + min
    }

    return null
}

export function parseYmdToLocal(ymd: string | null): Date | null {
    if (!ymd) return null
    const [y, m, d] = ymd.split("-").map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
}

export function toYmdKey(d: Date): string {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
}

export function startAt(session: DbSession): Date | null {
    if (!session.date || !session.time) return null
    const minutes = parseTimeToMinutes(session.time)
    if (minutes == null) return null
    const [y, m, d] = session.date.split("-").map(Number)
    if (!y || !m || !d) return null
    const hour = Math.floor(minutes / 60)
    const min = minutes % 60
    return new Date(y, m - 1, d, hour, min, 0, 0)
}

export function isSessionLiveNow(s: DbSession, now: Date): boolean {
    const at = startAt(s)
    if (!at) return false
    const t0 = at.getTime()
    const t1 = t0 + LIVE_WINDOW_MINUTES * 60 * 1000
    return now.getTime() >= t0 && now.getTime() < t1
}

export type TimeDisplayParts = { clock: string; period: string | null }

/** Partes para UI (reloj + AM/PM); el ticker y strings planos siguen usando `formatTimeLabel`. */
export function getTimeDisplayParts(session: DbSession): TimeDisplayParts | null {
    if (!session.time?.trim()) return null
    const minutes = parseTimeToMinutes(session.time)
    if (minutes == null) {
        const raw = session.time.trim()
        const m12 = /^(.+?)\s+(AM|PM)$/i.exec(raw)
        if (m12) return { clock: m12[1].trim(), period: m12[2].toUpperCase() }
        return { clock: raw, period: null }
    }
    const hour = Math.floor(minutes / 60)
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    const period = hour >= 12 ? "PM" : "AM"
    const clock = `${hour12}:${String(minutes % 60).padStart(2, "0")}`
    return { clock, period }
}

export function formatTimeLabel(session: DbSession): string {
    if (!session.time) return ""
    const minutes = parseTimeToMinutes(session.time)
    if (minutes == null) return session.time
    const hour = Math.floor(minutes / 60)
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    const period = hour >= 12 ? "PM" : "AM"
    return `${hour12}:${String(minutes % 60).padStart(2, "0")} ${period}`
}

export function weekdayLabel(session: DbSession): string {
    const at = startAt(session)
    if (at) return SPANISH_WEEKDAYS[at.getDay()]
    return session.day?.trim() || "Sesión"
}

/** Prefer stored `session_day`; fallback computed from `session_date` + `session_hour`. */
export function sessionDisplayDay(session: DbSession): string {
    const d = session.day?.trim()
    if (d) return d
    return weekdayLabel(session)
}

export function sessionDisplayHour(session: DbSession): string {
    return formatTimeLabel(session) || session.time?.trim() || ""
}

export function sortSessionsForAgenda(list: DbSession[]): DbSession[] {
    return [...list].sort((a, b) => {
        const da = parseYmdToLocal(a.date)
        const db = parseYmdToLocal(b.date)
        if (da && db) {
            const byDate = da.getTime() - db.getTime()
            if (byDate !== 0) return byDate
        } else if (da && !db) return -1
        else if (!da && db) return 1
        else {
            const sa = a.date ?? ""
            const sb = b.date ?? ""
            if (sa !== sb) return sa.localeCompare(sb)
        }

        const ta = parseTimeToMinutes(a.time ?? "")
        const tb = parseTimeToMinutes(b.time ?? "")
        if (ta != null && tb != null) return ta - tb
        if (ta != null) return -1
        if (tb != null) return 1
        return (a.time ?? "").localeCompare(b.time ?? "")
    })
}

/** Próxima sesión ya reservada por el usuario (en vivo o la siguiente futura). */
export function getNextBookedSession(sessions: DbSession[], now: Date): DbSession | null {
    const liveMs = LIVE_WINDOW_MINUTES * 60 * 1000
    const items = sessions
        .filter((s) => s.isBookedByUser)
        .map((s) => ({ s, at: startAt(s) }))
        .filter((x): x is { s: DbSession; at: Date } => x.at != null)
        .sort((a, b) => a.at.getTime() - b.at.getTime())

    const live = items.find(
        ({ at }) => now.getTime() >= at.getTime() && now.getTime() < at.getTime() + liveMs
    )
    if (live) return live.s

    const future = items.find(({ at }) => at.getTime() > now.getTime())
    return future?.s ?? null
}

export function getNextSessionFromDB(
    sessions: DbSession[],
    now: Date
): { status: SessionStatus; session: DbSession } | null {
    const upcoming = sessions
        .map((s) => ({ s, at: startAt(s) }))
        .filter((x): x is { s: DbSession; at: Date } => Boolean(x.at))
        .sort((a, b) => a.at.getTime() - b.at.getTime())

    if (upcoming.length === 0) return null

    const live = upcoming.find(
        ({ at }) =>
            now.getTime() >= at.getTime() &&
            now.getTime() < at.getTime() + LIVE_WINDOW_MINUTES * 60 * 1000
    )
    if (live) return { status: "live", session: live.s }

    const today = upcoming.find(({ at }) => {
        const sameDate =
            at.getFullYear() === now.getFullYear() &&
            at.getMonth() === now.getMonth() &&
            at.getDate() === now.getDate()
        return sameDate && at.getTime() > now.getTime()
    })
    if (today) return { status: "today", session: today.s }

    const next = upcoming.find(({ at }) => at.getTime() > now.getTime()) ?? upcoming[0]
    return { status: "next", session: next.s }
}

export function buildNextSessionTicker(
    sessionState: { status: SessionStatus; session: DbSession } | null,
    now: Date
): { line: string; joinHref: string } {
    if (!sessionState) return { line: "Sin próxima sesión programada.", joinHref: "#weekly-schedule" }

    const { status, session } = sessionState
    const joinHref = session.link?.trim() || "#weekly-schedule"
    const wd = weekdayLabel(session)
    const tm = formatTimeLabel(session) || "--"
    const at = startAt(session)

    if (status === "live" || isSessionLiveNow(session, now)) {
        return { line: `🔴 En vivo → ${wd} ${tm}`, joinHref }
    }
    if (!at) return { line: `🟢 Próxima sesión → ${wd} ${tm}`, joinHref }

    const ms = at.getTime() - now.getTime()
    if (ms <= 0) return { line: `🟢 ${wd} ${tm}`, joinHref }

    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`
    return { line: `🟢 Próxima sesión en ${countdown} → ${wd} ${tm}`, joinHref }
}

/** DB `capacity` / `seats_taken` are exposed as `max_slots` / `booked_slots` on `DbSession`. */
export function getSessionCapacityAndTaken(session: DbSession): { capacity: number; seatsTaken: number } {
    const capacity = session.max_slots ?? 0
    const seatsTaken = session.booked_slots ?? 0
    return { capacity, seatsTaken }
}

/** Free seats = capacity − seats_taken (never negative). */
export function getSessionAvailableSeats(session: DbSession): number {
    if (typeof session.available_spots === "number") {
        return Math.max(0, session.available_spots)
    }
    const { capacity, seatsTaken } = getSessionCapacityAndTaken(session)
    return Math.max(0, capacity - seatsTaken)
}

export function getSessionMeta(session: DbSession) {
    const available = getSessionAvailableSeats(session)
    const isFull = available <= 0
    const status = isFull ? "Completo" : available <= 2 ? "Últimos cupos" : "Disponible"
    const statusColor = isFull ? "#fca5a5" : available <= 2 ? "#fbbf24" : "#a7f3d0"
    return { available, isFull, status, statusColor }
}
