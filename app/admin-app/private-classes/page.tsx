import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppPrivateClassesClient from "./AdminAppPrivateClassesClient"

export default async function AdminAppPrivateClassesPage() {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app")
    }

    return <AdminAppPrivateClassesClient />
}
