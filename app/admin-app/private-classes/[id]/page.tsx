import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppPrivateClassDetailClient from "./AdminAppPrivateClassDetailClient"

type Props = {
    params: Promise<{ id: string }>
}

export default async function AdminAppPrivateClassDetailPage({ params }: Props) {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app")
    }

    const { id } = await params
    const requestId = typeof id === "string" ? id.trim() : ""
    if (!requestId) {
        redirect("/admin-app/private-classes")
    }

    return <AdminAppPrivateClassDetailClient requestId={requestId} />
}
