import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"
import { redirect } from "next/navigation"
import AdminAppStudentDetailClient from "./AdminAppStudentDetailClient"

type Props = {
    params: Promise<{ email: string }>
}

export default async function AdminAppStudentDetailPage({ params }: Props) {
    const adminEmail = await getAuthorizedAdminEmailFromCookies()
    if (!adminEmail) {
        redirect("/admin-login?error=session_expired&next=/admin-app")
    }

    const { email: raw } = await params
    const email = decodeURIComponent(typeof raw === "string" ? raw : "")
        .trim()
        .toLowerCase()
    if (!email || !email.includes("@")) {
        redirect("/admin-app/students")
    }

    return <AdminAppStudentDetailClient studentEmail={email} />
}
