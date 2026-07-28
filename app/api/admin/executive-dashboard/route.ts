import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import {
    ACTIVITY_FEED_TYPES,
    type ActivityFeedItem,
    type ActivityFeedType,
} from "@/lib/activityFeed"
import type {
    ExecutiveMetrics,
    ExecutiveUpcomingSession,
    StudentGrowthPoint,
} from "@/lib/executiveDashboard"

export const runtime = "nodejs"

const ACTIVITY_LIMIT = 20
const UPCOMING_LIMIT = 8
const GROWTH_MONTHS = 6

function isActivityType(value: unknown): value is ActivityFeedType {
    return typeof value === "string" && (ACTIVITY_FEED_TYPES as readonly string[]).includes(value)
}

function weekRangeYmd(now: Date): { start: string; end: string } {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const day = d.getUTCDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diffToMonday)
    const start = d.toISOString().slice(0, 10)
    const endD = new Date(d)
    endD.setUTCDate(endD.getUTCDate() + 6)
    const end = endD.toISOString().slice(0, 10)
    return { start, end }
}

function monthKeysLastN(now: Date, n: number): string[] {
    const keys: string[] = []
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    for (let i = n - 1; i >= 0; i -= 1) {
        const dt = new Date(Date.UTC(y, m - i, 1))
        const yy = dt.getUTCFullYear()
        const mm = String(dt.getUTCMonth() + 1).padStart(2, "0")
        keys.push(`${yy}-${mm}`)
    }
    return keys
}

function mapActivity(row: Record<string, unknown>): ActivityFeedItem | null {
    const id = typeof row.id === "string" ? row.id : null
    if (!id || !isActivityType(row.type)) return null
    return {
        id,
        type: row.type,
        title: typeof row.title === "string" ? row.title : "",
        description: typeof row.description === "string" ? row.description : "",
        created_at: typeof row.created_at === "string" ? row.created_at : "",
        metadata:
            row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
                ? (row.metadata as Record<string, unknown>)
                : {},
    }
}

export async function GET() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const supabase = createSupabaseServiceRoleClient()
        const now = new Date()
        const { start: weekStart, end: weekEnd } = weekRangeYmd(now)
        const expireUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        const nowIso = now.toISOString()
        const growthKeys = monthKeysLastN(now, GROWTH_MONTHS)
        const growthStart = `${growthKeys[0]}-01T00:00:00.000Z`

        const [
            totalStudentsRes,
            activeStudentsRes,
            sessionsRes,
            openTicketsRes,
            expiringRes,
            activityRes,
            growthRes,
        ] = await Promise.all([
            supabase.from("trading_students").select("id", { count: "exact", head: true }),
            supabase
                .from("trading_students")
                .select("id", { count: "exact", head: true })
                .or("is_active.is.null,is_active.eq.true"),
            supabase.from("sessions").select("*").eq("status", "active"),
            supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "open"),
            supabase
                .from("trading_students")
                .select("id", { count: "exact", head: true })
                .or("is_active.is.null,is_active.eq.true")
                .gte("access_expires_at", nowIso)
                .lte("access_expires_at", expireUntil),
            supabase
                .from("activity_feed")
                .select("id, type, title, description, created_at, metadata")
                .order("created_at", { ascending: false })
                .limit(ACTIVITY_LIMIT),
            supabase
                .from("trading_students")
                .select("created_at")
                .gte("created_at", growthStart)
                .limit(2000),
        ])

        if (totalStudentsRes.error) {
            console.error("[executive-dashboard] total students", totalStudentsRes.error)
            return NextResponse.json({ error: "Failed to load students" }, { status: 500 })
        }
        if (activeStudentsRes.error) {
            console.error("[executive-dashboard] active students", activeStudentsRes.error)
            return NextResponse.json({ error: "Failed to load active students" }, { status: 500 })
        }
        if (sessionsRes.error) {
            console.error("[executive-dashboard] sessions", sessionsRes.error)
            return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 })
        }
        if (openTicketsRes.error) {
            console.error("[executive-dashboard] tickets", openTicketsRes.error)
            return NextResponse.json({ error: "Failed to load support tickets" }, { status: 500 })
        }
        if (expiringRes.error) {
            console.error("[executive-dashboard] expiring", expiringRes.error)
            return NextResponse.json({ error: "Failed to load expiring subscriptions" }, { status: 500 })
        }

        const totalStudents = typeof totalStudentsRes.count === "number" ? totalStudentsRes.count : 0
        const activeStudents = typeof activeStudentsRes.count === "number" ? activeStudentsRes.count : 0

        const sessionRows = Array.isArray(sessionsRes.data) ? sessionsRes.data : []
        const normalizedSessions = sessionRows.map((row) => {
            const r = row as Record<string, unknown>
            const date =
                typeof r.date === "string"
                    ? r.date
                    : typeof r.session_date === "string"
                      ? r.session_date
                      : null
            const time =
                typeof r.time === "string"
                    ? r.time
                    : typeof r.session_hour === "string"
                      ? r.session_hour
                      : null
            return {
                id: typeof r.id === "string" ? r.id : "",
                title: typeof r.title === "string" ? r.title : null,
                date,
                time,
            }
        })

        const liveSessionsThisWeek = normalizedSessions.filter((s) => {
            if (!s.date) return false
            return s.date >= weekStart && s.date <= weekEnd
        }).length

        const upcomingSessions: ExecutiveUpcomingSession[] = normalizedSessions
            .filter((s) => Boolean(s.id && s.date && s.date >= now.toISOString().slice(0, 10)))
            .sort((a, b) => {
                const ad = `${a.date ?? ""}T${a.time ?? "00:00"}`
                const bd = `${b.date ?? ""}T${b.time ?? "00:00"}`
                return ad.localeCompare(bd)
            })
            .slice(0, UPCOMING_LIMIT)
            .map((s) => ({
                id: s.id,
                title: s.title,
                date: s.date,
                time: s.time,
                // Capacity model removed — placeholders until product reintroduces seats.
                capacity: null,
                bookedSeats: null,
                seatStatus: "unknown" as const,
                startsAt: s.date && s.time ? `${s.date}T${s.time}` : s.date,
            }))

        const activity = (Array.isArray(activityRes.data) ? activityRes.data : [])
            .map((row) => mapActivity(row as Record<string, unknown>))
            .filter((n): n is ActivityFeedItem => n !== null)

        if (activityRes.error) {
            console.error("[executive-dashboard] activity", activityRes.error)
        }

        const growthCounts = new Map<string, number>(growthKeys.map((k) => [k, 0]))
        if (!growthRes.error && Array.isArray(growthRes.data)) {
            for (const row of growthRes.data) {
                const created = (row as { created_at?: string | null }).created_at
                if (typeof created !== "string" || !created) continue
                const key = created.slice(0, 7)
                if (growthCounts.has(key)) {
                    growthCounts.set(key, (growthCounts.get(key) ?? 0) + 1)
                }
            }
        } else if (growthRes.error) {
            console.error("[executive-dashboard] growth", growthRes.error)
        }

        const studentGrowth: StudentGrowthPoint[] = growthKeys.map((monthKey) => {
            const [yy, mm] = monthKey.split("-")
            const label = new Date(Date.UTC(Number(yy), Number(mm) - 1, 1)).toLocaleString("en", {
                month: "short",
                year: "2-digit",
                timeZone: "UTC",
            })
            return {
                monthKey,
                label,
                count: growthCounts.get(monthKey) ?? 0,
            }
        })

        const metrics: ExecutiveMetrics = {
            totalStudents,
            activeStudents,
            liveSessionsThisWeek,
            openSupportTickets: typeof openTicketsRes.count === "number" ? openTicketsRes.count : 0,
            expiringSubscriptions: typeof expiringRes.count === "number" ? expiringRes.count : 0,
            totalBookedSeatsThisWeek: null,
            seatOccupancyPercent: null,
            monthlyRevenue: null,
        }

        return NextResponse.json({
            metrics,
            activity,
            upcomingSessions,
            studentGrowth,
            meta: {
                seatsAvailable: false,
                revenueAvailable: false,
                weekStart,
                weekEnd,
            },
        })
    } catch (e) {
        console.error("[api/admin/executive-dashboard] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
