import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"
import { SessionProvider } from "@/context/SessionContext"
import { getBookingAccessState, resolveBookingActor } from "@/lib/bookingAccess"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { ensureTradingStudentByEmail, isTradingStudentProfileCompleted } from "@/lib/tradingStudents"
import { createClient } from "@supabase/supabase-js"
import { fetchBookedSessionIdsForActor } from "@/lib/sessionBookings"
import type { DbSession } from "@/lib/sessions"

export default async function DashboardPage() {
    const actor = await resolveBookingActor()
    if (!actor.email) {
        redirect("/login?redirect=/dashboard")
    }

    try {
        const admin = createSupabaseServiceRoleClient()
        const profileRow = await ensureTradingStudentByEmail(admin, actor.email)
        if (!isTradingStudentProfileCompleted(profileRow)) {
            console.log("📄 profile incomplete", { email: actor.email })
            redirect("/complete-profile")
        }
        console.log("✅ profile completed", { email: actor.email })
    } catch (e) {
        console.error("[dashboard] profile check failed", e)
        redirect("/complete-profile")
    }

    const bookingAccess = await getBookingAccessState()

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return (
            <SessionProvider initialSessions={[]} initialBookingAccess={bookingAccess}>
                <DashboardClient />
            </SessionProvider>
        )
    }

    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    const todayStr = `${yyyy}-${mm}-${dd}`

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data, error } = await supabase
        .from("sessions")
        .select("id, day, date, time, max_slots, booked_slots, link")
        .gte("date", todayStr)
        .order("date", { ascending: true })
        .order("time", { ascending: true })

    if (error) {
        console.error("[dashboard] Failed to load sessions", error)
        return (
            <SessionProvider initialSessions={[]} initialBookingAccess={bookingAccess}>
                <DashboardClient />
            </SessionProvider>
        )
    }

    const rows = (data ?? []) as DbSession[]
    const bookedIds = new Set(await fetchBookedSessionIdsForActor(supabase, actor))
    const initialSessions: DbSession[] = rows.map((s) => ({
        ...s,
        isBookedByUser: bookedIds.has(s.id),
    }))

    return (
        <SessionProvider initialSessions={initialSessions} initialBookingAccess={bookingAccess}>
            <DashboardClient />
        </SessionProvider>
    )
}
