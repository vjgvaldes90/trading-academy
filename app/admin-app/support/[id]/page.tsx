import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppSupportTicketClient from "./AdminAppSupportTicketClient"

type Props = {
    params: Promise<{ id: string }>
}

export default async function AdminAppSupportTicketPage({ params }: Props) {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app")
    }

    const { id } = await params
    const ticketId = typeof id === "string" ? id.trim() : ""
    if (!ticketId) {
        redirect("/admin-app/support")
    }

    return <AdminAppSupportTicketClient ticketId={ticketId} />
}
