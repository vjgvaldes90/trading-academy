import { NextResponse } from "next/server"
import { requireAuthorizedAdminFromCookies } from "@/lib/adminAuth"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import type { ExecutiveMetrics, StudentGrowthPoint } from "@/lib/executiveDashboard"

export const runtime = "nodejs"

const GROWTH_MONTHS = 6

function weekStartIso(now: Date): string {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const day = d.getUTCDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diffToMonday)
    d.setUTCHours(0, 0, 0, 0)
    return d.toISOString()
}

function monthStartIso(now: Date): string {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString()
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

export async function GET() {
    try {
        const auth = await requireAuthorizedAdminFromCookies()
        if (!auth.ok) return auth.response

        const supabase = createSupabaseServiceRoleClient()
        const now = new Date()
        const weekStart = weekStartIso(now)
        const monthStart = monthStartIso(now)
        const growthKeys = monthKeysLastN(now, GROWTH_MONTHS)
        const growthStart = `${growthKeys[0]}-01T00:00:00.000Z`

        const [
            totalStudentsRes,
            activeStudentsRes,
            newThisWeekRes,
            newThisMonthRes,
            openTicketsRes,
            growthRes,
        ] = await Promise.all([
            supabase.from("trading_students").select("id", { count: "exact", head: true }),
            supabase
                .from("trading_students")
                .select("id", { count: "exact", head: true })
                .or("is_active.is.null,is_active.eq.true"),
            supabase
                .from("trading_students")
                .select("id", { count: "exact", head: true })
                .gte("created_at", weekStart),
            supabase
                .from("trading_students")
                .select("id", { count: "exact", head: true })
                .gte("created_at", monthStart),
            supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "open"),
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
        if (newThisWeekRes.error) {
            console.error("[executive-dashboard] new this week", newThisWeekRes.error)
            return NextResponse.json({ error: "Failed to load weekly students" }, { status: 500 })
        }
        if (newThisMonthRes.error) {
            console.error("[executive-dashboard] new this month", newThisMonthRes.error)
            return NextResponse.json({ error: "Failed to load monthly students" }, { status: 500 })
        }
        if (openTicketsRes.error) {
            console.error("[executive-dashboard] tickets", openTicketsRes.error)
            return NextResponse.json({ error: "Failed to load support tickets" }, { status: 500 })
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
            totalStudents: typeof totalStudentsRes.count === "number" ? totalStudentsRes.count : 0,
            activeStudents: typeof activeStudentsRes.count === "number" ? activeStudentsRes.count : 0,
            newThisWeek: typeof newThisWeekRes.count === "number" ? newThisWeekRes.count : 0,
            newThisMonth: typeof newThisMonthRes.count === "number" ? newThisMonthRes.count : 0,
            openSupportTickets: typeof openTicketsRes.count === "number" ? openTicketsRes.count : 0,
        }

        return NextResponse.json({ metrics, studentGrowth })
    } catch (e) {
        console.error("[api/admin/executive-dashboard] GET", e)
        return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
}
