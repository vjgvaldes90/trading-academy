import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppTradingSessionDetailClient from "./AdminAppTradingSessionDetailClient"

type Props = {
    params: Promise<{ id: string }>
}

export default async function AdminAppTradingSessionDetailPage({ params }: Props) {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app")
    }

    const { id } = await params
    const sessionId = typeof id === "string" ? id.trim() : ""
    if (!sessionId) {
        redirect("/admin-app/trading-sessions")
    }

    return <AdminAppTradingSessionDetailClient sessionId={sessionId} />
}
