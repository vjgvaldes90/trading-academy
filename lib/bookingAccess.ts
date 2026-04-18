import { cookies } from "next/headers"
import { canUserBook, createSupabaseServiceRoleClient, type BookingActor } from "@/lib/access"

export type BookingAccessState = {
    canBook: boolean
    message: string | null
    actor: BookingActor
}

/** Resolve who is booking from legacy httpOnly `session` cookie (email). */
export async function resolveBookingActor(): Promise<BookingActor> {
    let email: string | null = null

    const cookieStore = await cookies()
    const legacyEmail = cookieStore.get("session")?.value?.trim().toLowerCase() ?? null
    if (legacyEmail) {
        email = legacyEmail
    }

    return { email }
}

export async function getBookingAccessState(): Promise<BookingAccessState> {
    const actor = await resolveBookingActor()

    try {
        const admin = createSupabaseServiceRoleClient()
        const result = await canUserBook(admin, null, actor.email)
        if (result.ok) {
            return { canBook: true, message: null, actor }
        }
        return { canBook: false, message: result.reason, actor }
    } catch (e) {
        console.error("[getBookingAccessState]", e)
        return {
            canBook: false,
            message: "No pudimos verificar tu acceso.",
            actor,
        }
    }
}
