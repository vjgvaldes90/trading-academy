import DashboardPageClient from "./DashboardPageClient"

/** Server shell only — dashboard logic runs in `DashboardPageClient` ("use client"). */
export default function DashboardPage() {
    return <DashboardPageClient />
}
