import type { AdminRevenueMetrics } from "@/lib/adminRevenue"

export type ExecutiveMetrics = {
    totalStudents: number
    activeStudents: number
    newThisWeek: number
    newThisMonth: number
    openSupportTickets: number
}

export type StudentGrowthPoint = {
    monthKey: string
    label: string
    count: number
}

export type ExecutiveDashboardResponse = {
    metrics: ExecutiveMetrics
    studentGrowth: StudentGrowthPoint[]
    /** null if Stripe is unavailable or revenue fetch failed. */
    revenue: AdminRevenueMetrics | null
}
