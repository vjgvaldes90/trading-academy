import { redirect } from "next/navigation"
import { resolveBookingActor } from "@/lib/bookingAccess"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { ensureTradingStudentByEmail, isTradingStudentProfileCompleted } from "@/lib/tradingStudents"
import CompleteProfileForm from "./CompleteProfileForm"

export default async function CompleteProfilePage() {
    const actor = await resolveBookingActor()
    if (!actor.email) {
        redirect("/login?redirect=/complete-profile")
    }

    const admin = createSupabaseServiceRoleClient()
    const row = await ensureTradingStudentByEmail(admin, actor.email)
    if (isTradingStudentProfileCompleted(row)) {
        console.log("✅ profile completed", { email: actor.email })
        redirect("/dashboard")
    }
    console.log("📄 profile incomplete", { email: actor.email })

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 py-12">
            <CompleteProfileForm userEmail={actor.email} />
        </div>
    )
}
