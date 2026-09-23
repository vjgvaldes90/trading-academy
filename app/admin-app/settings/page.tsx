import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppPushSettingsClient from "./AdminAppPushSettingsClient"

export default async function AdminAppSettingsPage() {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app/settings")
    }

    return <AdminAppPushSettingsClient />
}
