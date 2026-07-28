import type { ActivityFeedItem } from "@/lib/activityFeed"

export type ExecutiveMetrics = {
    totalStudents: number
    activeStudents: number
    liveSessionsThisWeek: number
    openSupportTickets: number
    expiringSubscriptions: number
    /** null when bookings/capacity schema is unavailable */
    totalBookedSeatsThisWeek: number | null
    /** null when bookings/capacity schema is unavailable */
    seatOccupancyPercent: number | null
    /** null until Stripe revenue aggregation is wired */
    monthlyRevenue: number | null
}

export type ExecutiveUpcomingSession = {
    id: string
    title: string | null
    date: string | null
    time: string | null
    capacity: number | null
    bookedSeats: number | null
    seatStatus: "available" | "full" | "unknown"
    startsAt: string | null
}

export type StudentGrowthPoint = {
    monthKey: string
    label: string
    count: number
}

export type ExecutiveDashboardResponse = {
    metrics: ExecutiveMetrics
    activity: ActivityFeedItem[]
    upcomingSessions: ExecutiveUpcomingSession[]
    studentGrowth: StudentGrowthPoint[]
    meta: {
        seatsAvailable: boolean
        revenueAvailable: boolean
        weekStart: string
        weekEnd: string
    }
}
