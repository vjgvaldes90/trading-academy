import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppShell from "./AdminAppShell"

export default async function AdminAppPage() {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app")
    }

    return <AdminAppShell adminEmail={adminEmail} />
}
