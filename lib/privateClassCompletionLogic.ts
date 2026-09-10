/**
 * Private Class auto-completion — pure timing helpers + self-checks.
 * End time = requested wall-clock (America/New_York) + duration_minutes.
 */

import {
    PRIVATE_CLASS_DURATION_MINUTES,
    privateClassSlotToUtc,
    type PrivateClassStatus,
} from "./privateClassRequests"

export type PrivateClassCompletionCandidate = {
    id: string
    status: string
    requested_date: string
    requested_time: string
    duration_minutes?: number | null
}

/** Instant when a Private Class slot ends (start + duration) in UTC. */
export function getPrivateClassEndUtc(
    dateYmd: string,
    timeHms: string,
    durationMinutes: number = PRIVATE_CLASS_DURATION_MINUTES
): Date | null {
    const start = privateClassSlotToUtc(dateYmd, timeHms)
    if (!start) return null
    const minutes =
        typeof durationMinutes === "number" && Number.isFinite(durationMinutes) && durationMinutes > 0
            ? Math.floor(durationMinutes)
            : PRIVATE_CLASS_DURATION_MINUTES
    return new Date(start.getTime() + minutes * 60_000)
}

/**
 * True when status is confirmed and start+duration is at or before `now`.
 * Other statuses (including completed) never qualify.
 */
export function isPrivateClassDueForCompletion(
    row: PrivateClassCompletionCandidate,
    now: Date = new Date()
): boolean {
    if (String(row.status ?? "") !== "confirmed") return false
    const duration =
        typeof row.duration_minutes === "number" && row.duration_minutes > 0
            ? row.duration_minutes
            : PRIVATE_CLASS_DURATION_MINUTES
    const end = getPrivateClassEndUtc(row.requested_date, row.requested_time, duration)
    if (!end) return false
    return end.getTime() <= now.getTime()
}

export type PrivateClassCompletionSelfCheck = {
    name: string
    pass: boolean
    detail: string
}

/** Deterministic checks — no DB. Safe to run under CRON_SECRET or via scripts. */
export function runPrivateClassCompletionSelfChecks(): {
    ok: boolean
    results: PrivateClassCompletionSelfCheck[]
} {
    const results: PrivateClassCompletionSelfCheck[] = []

    const push = (name: string, pass: boolean, detail: string) => {
        results.push({ name, pass, detail })
    }

    // 1) confirmed + ended → due
    {
        const end = getPrivateClassEndUtc("2026-09-10", "14:00:00", 120)
        const now = end ? new Date(end.getTime() + 1_000) : new Date(0)
        const due = isPrivateClassDueForCompletion(
            {
                id: "a",
                status: "confirmed",
                requested_date: "2026-09-10",
                requested_time: "14:00:00",
                duration_minutes: 120,
            },
            now
        )
        push(
            "confirmed_past_end_becomes_due",
            Boolean(end) && due,
            due
                ? "confirmed slot after end is due"
                : "expected due=true for ended confirmed class"
        )
    }

    // 2) confirmed + still in progress / future → not due
    {
        const start = privateClassSlotToUtc("2026-09-10", "14:00:00")
        const now = start ? new Date(start.getTime() + 30 * 60_000) : new Date(0) // +30m into class
        const due = isPrivateClassDueForCompletion(
            {
                id: "b",
                status: "confirmed",
                requested_date: "2026-09-10",
                requested_time: "14:00:00",
                duration_minutes: 120,
            },
            now
        )
        push(
            "confirmed_before_end_stays_confirmed",
            !due,
            due ? "incorrectly marked due mid-class" : "mid-class confirmed is not due"
        )
    }

    // 3) completed → never due again
    {
        const due = isPrivateClassDueForCompletion(
            {
                id: "c",
                status: "completed",
                requested_date: "2020-01-01",
                requested_time: "10:00:00",
                duration_minutes: 120,
            },
            new Date("2030-01-01T00:00:00.000Z")
        )
        push(
            "completed_never_due",
            !due,
            due ? "completed must not be due" : "completed stays completed (not due)"
        )
    }

    // 4) reschedule uses new date/time (old slot ignored)
    {
        const newEnd = getPrivateClassEndUtc("2026-09-20", "18:00:00", 120)
        const now = newEnd ? new Date(newEnd.getTime() - 60_000) : new Date(0) // 1m before new end
        const dueWithNew = isPrivateClassDueForCompletion(
            {
                id: "d",
                status: "confirmed",
                requested_date: "2026-09-20",
                requested_time: "18:00:00",
                duration_minutes: 120,
            },
            now
        )
        const dueIfOldStillUsed = isPrivateClassDueForCompletion(
            {
                id: "d-old",
                status: "confirmed",
                requested_date: "2026-09-10",
                requested_time: "14:00:00",
                duration_minutes: 120,
            },
            now
        )
        push(
            "reschedule_uses_new_slot",
            !dueWithNew && dueIfOldStillUsed,
            !dueWithNew && dueIfOldStillUsed
                ? "new slot not due yet; old slot would be due — logic uses stored fields"
                : "reschedule timing check failed"
        )
    }

    // 5) America/New_York + DST (EST vs EDT)
    {
        // 2026-01-15 14:00 EST (UTC-5) → end 16:00 EST = 21:00 UTC
        const winterEnd = getPrivateClassEndUtc("2026-01-15", "14:00:00", 120)
        const winterOk =
            winterEnd !== null && winterEnd.toISOString() === "2026-01-15T21:00:00.000Z"

        // 2026-07-15 14:00 EDT (UTC-4) → end 16:00 EDT = 20:00 UTC
        const summerEnd = getPrivateClassEndUtc("2026-07-15", "14:00:00", 120)
        const summerOk =
            summerEnd !== null && summerEnd.toISOString() === "2026-07-15T20:00:00.000Z"

        push(
            "america_new_york_dst",
            winterOk && summerOk,
            `winterEnd=${winterEnd?.toISOString() ?? "null"} summerEnd=${summerEnd?.toISOString() ?? "null"}`
        )
    }

    // Example from product brief: 2026-09-10 14:00 + 120 → due from 16:00 ET
    {
        const end = getPrivateClassEndUtc("2026-09-10", "14:00:00", 120)
        // Sep 10 2026 is EDT → 16:00 EDT = 20:00 UTC
        const expectedIso = "2026-09-10T20:00:00.000Z"
        const justBefore = end ? new Date(end.getTime() - 1) : new Date(0)
        const justAfter = end ? new Date(end.getTime()) : new Date(0)
        const row: PrivateClassCompletionCandidate = {
            id: "ex",
            status: "confirmed",
            requested_date: "2026-09-10",
            requested_time: "14:00:00",
            duration_minutes: 120,
        }
        const beforeDue = isPrivateClassDueForCompletion(row, justBefore)
        const afterDue = isPrivateClassDueForCompletion(row, justAfter)
        const isoOk = end?.toISOString() === expectedIso
        push(
            "example_sept_10_2026_2pm_et",
            isoOk && !beforeDue && afterDue,
            `end=${end?.toISOString() ?? "null"} beforeDue=${beforeDue} afterDue=${afterDue}`
        )
    }

    return { ok: results.every((r) => r.pass), results }
}

/** Status filter helper for callers that need typing. */
export function isConfirmedStatus(status: string): status is Extract<PrivateClassStatus, "confirmed"> {
    return status === "confirmed"
}
