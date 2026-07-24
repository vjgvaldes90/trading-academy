import { cookies } from "next/headers"
import { canAccessAcademy, createSupabaseServiceRoleClient, type AcademyActor } from "@/lib/access"

export type AcademyAccessState = {
    canAccess: boolean
    message: string | null
    actor: AcademyActor
}

/** Resolve authenticated student email from legacy httpOnly `session` cookie. */
export async function resolveAcademyActor(): Promise<AcademyActor> {
    let email: string | null = null

    const cookieStore = await cookies()
    const legacyEmail = cookieStore.get("session")?.value?.trim().toLowerCase() ?? null
    if (legacyEmail) {
        email = legacyEmail
    }

    return { email }
}

export async function getAcademyAccessState(): Promise<AcademyAccessState> {
    const actor = await resolveAcademyActor()

    try {
        const admin = createSupabaseServiceRoleClient()
        const result = await canAccessAcademy(admin, null, actor.email)
        if (result.ok) {
            return { canAccess: true, message: null, actor }
        }
        return { canAccess: false, message: result.reason, actor }
    } catch (e) {
        console.error("[getAcademyAccessState]", e)
        return {
            canAccess: false,
            message: "No pudimos verificar tu acceso.",
            actor,
        }
    }
}
