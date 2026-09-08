import { z } from "zod"

/** Server-fixed product constants — never accept from the client. */
export const PRIVATE_CLASS_DURATION_MINUTES = 120
export const PRIVATE_CLASS_PRICE_CENTS = 25000
export const PRIVATE_CLASS_CURRENCY = "usd" as const

/** Academy wall-clock zone (same product convention as live sessions). */
export const PRIVATE_CLASS_TIME_ZONE = "America/New_York"

export const PRIVATE_CLASS_STATUSES = [
    "pending",
    "rejected",
    "awaiting_payment",
    "paid",
    "confirmed",
    "completed",
    "cancelled",
] as const

export type PrivateClassStatus = (typeof PRIVATE_CLASS_STATUSES)[number]

export const PRIVATE_CLASS_ADMIN_ACTIONS = ["approve", "reject", "cancel"] as const
export type PrivateClassAdminAction = (typeof PRIVATE_CLASS_ADMIN_ACTIONS)[number]

export type PrivateClassRequestRow = {
    id: string
    student_id: string
    student_email: string
    requested_date: string
    requested_time: string
    duration_minutes: number
    price_cents: number
    currency: string
    status: PrivateClassStatus | string
    student_message: string | null
    admin_notes: string | null
    approved_by_admin_email: string | null
    rejected_by_admin_email: string | null
    approved_at: string | null
    rejected_at: string | null
    cancelled_at: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    stripe_checkout_session_id?: string | null
    stripe_payment_intent_id?: string | null
    stripe_payment_status?: string | null
    paid_at?: string | null
}

/** Stage 1–3 columns (Stripe fields require migration 20260907150000). */
export const PRIVATE_CLASS_REQUEST_SELECT =
    "id, student_id, student_email, requested_date, requested_time, duration_minutes, price_cents, currency, status, student_message, admin_notes, approved_by_admin_email, rejected_by_admin_email, approved_at, rejected_at, cancelled_at, completed_at, created_at, updated_at, stripe_checkout_session_id, stripe_payment_intent_id, stripe_payment_status, paid_at"

/** Stripe Checkout metadata product_type for Private Class one-time payment. */
export const PRIVATE_CLASS_PRODUCT_TYPE = "private_class" as const

export const privateClassRequestIdSchema = z.string().uuid()

export const createPrivateClassRequestSchema = z.object({
    requested_date: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "requested_date must be YYYY-MM-DD"),
    requested_time: z
        .string()
        .trim()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, "requested_time must be HH:mm or HH:mm:ss"),
    student_message: z
        .string()
        .trim()
        .max(2000, "student_message is too long")
        .optional()
        .nullable(),
})

export const privateClassAdminActionSchema = z.object({
    action: z.enum(PRIVATE_CLASS_ADMIN_ACTIONS),
    admin_notes: z.string().trim().max(2000).optional().nullable(),
})

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
    const y = pick("year")
    const m = pick("month")
    const d = pick("day")
    const h = pick("hour")
    const min = pick("minute")
    const s = pick("second")
    const asUtc = Date.UTC(y, m - 1, d, h, min, s, 0)
    return asUtc - at.getTime()
}

/** Wall-clock date+time in America/New_York → UTC instant. */
export function privateClassSlotToUtc(
    dateYmd: string,
    timeHms: string,
    timeZone: string = PRIVATE_CLASS_TIME_ZONE
): Date | null {
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(timeHms.trim())
    if (!timeMatch) return null
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim())
    if (!dateMatch) return null

    const y = Number(dateMatch[1])
    const m = Number(dateMatch[2])
    const d = Number(dateMatch[3])
    const hour = Number(timeMatch[1])
    const min = Number(timeMatch[2])
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null

    const wallClockUtcMs = Date.UTC(y, m - 1, d, hour, min, 0, 0)
    let utcMs = wallClockUtcMs
    for (let i = 0; i < 2; i++) {
        const offsetMs = getTimeZoneOffsetMs(new Date(utcMs), timeZone)
        utcMs = wallClockUtcMs - offsetMs
    }
    return new Date(utcMs)
}

export function isPrivateClassSlotInPast(
    dateYmd: string,
    timeHms: string,
    now: Date = new Date()
): boolean {
    const start = privateClassSlotToUtc(dateYmd, timeHms)
    if (!start) return true
    return start.getTime() <= now.getTime()
}

/** Normalize time for Postgres `time` column (HH:mm:ss). */
export function normalizeRequestedTime(raw: string): string {
    const m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(raw.trim())
    if (!m) return raw.trim()
    const sec = m[3] ?? "00"
    return `${m[1]}:${m[2]}:${sec}`
}

export function isPrivateClassStatus(value: string): value is PrivateClassStatus {
    return (PRIVATE_CLASS_STATUSES as readonly string[]).includes(value)
}

export function publicPrivateClassRequest(row: PrivateClassRequestRow) {
    return {
        id: row.id,
        student_id: row.student_id,
        student_email: row.student_email,
        requested_date: row.requested_date,
        requested_time: row.requested_time,
        duration_minutes: row.duration_minutes,
        price_cents: row.price_cents,
        currency: row.currency,
        status: row.status,
        student_message: row.student_message,
        admin_notes: row.admin_notes,
        approved_by_admin_email: row.approved_by_admin_email,
        rejected_by_admin_email: row.rejected_by_admin_email,
        approved_at: row.approved_at,
        rejected_at: row.rejected_at,
        cancelled_at: row.cancelled_at,
        completed_at: row.completed_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}
