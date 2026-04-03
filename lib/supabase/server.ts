import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { requireServerSupabasePublicEnv } from "@/lib/supabase/publicEnv"

/**
 * Supabase browser session (JWT) read on the server.
 * Legacy `session` cookie (email) still works for dashboard until full Auth migration.
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies()
    const { url, anonKey: anon } = requireServerSupabasePublicEnv()

    return createServerClient(url, anon, {
        cookies: {
            getAll() {
                return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                } catch {
                    /* Server Component / read-only cookie scope */
                }
            },
        },
    })
}
