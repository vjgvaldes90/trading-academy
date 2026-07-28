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
}
