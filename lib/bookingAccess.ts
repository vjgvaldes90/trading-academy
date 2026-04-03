import { cookies } from "next/headers"
import { canUserBook, createSupabaseServiceRoleClient, type BookingActor } from "@/lib/access"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type BookingAccessState = {
    canBook: boolean
    message: string | null
    actor: BookingActor
}

/**
 * Resolve who is booking: Supabase Auth user (preferred) or legacy httpOnly `session` cookie (email).
 */
export async function resolveBookingActor(): Promise<BookingActor> {
    let userId: string | null = null
    let email: string | null = null

    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            userId = user.id
            email = user.email?.trim().toLowerCase() ?? null
        }
    } catch {
        /* Missing env or no auth cookies */
    }

    const cookieStore = await cookies()
    const legacyEmail = cookieStore.get("session")?.value?.trim().toLowerCase() ?? null
    if (!email && legacyEmail) {
        email = legacyEmail
    }

    return { userId, email }
}

export async function getBookingAccessState(): Promise<BookingAccessState> {
    const actor = await resolveBookingActor()

    try {
        const admin = createSupabaseServiceRoleClient()
        const result = await canUserBook(admin, actor.userId, actor.email)
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
