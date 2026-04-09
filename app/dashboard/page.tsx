import DashboardPageClient from "./DashboardPageClient"

/** Server shell only — all dashboard + booking logic runs in `DashboardPageClient` ("use client"). */
export default function DashboardPage() {
    return <DashboardPageClient />
}
