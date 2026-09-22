import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppSupportClient from "./AdminAppSupportClient"

export default async function AdminAppSupportPage() {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app")
    }

    return <AdminAppSupportClient />
}
