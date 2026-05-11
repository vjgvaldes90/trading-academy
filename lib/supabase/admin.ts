import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase client with the **service role** key. Bypasses RLS.
 *
 * **Server-only:** import only from API routes, Route Handlers, Server Actions,
 * or other server code. Never import from client components or shared modules
 * used by the browser.
 */
function createSupabaseAdminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!serviceRoleKey) {
        throw new Error(
            "Missing SUPABASE_SERVICE_ROLE_KEY: the admin Supabase client cannot be created. Set it in server environment variables only."
        )
    }
    if (!url) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL: required for supabaseAdmin alongside SUPABASE_SERVICE_ROLE_KEY."
        )
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}

export const supabaseAdmin: SupabaseClient = createSupabaseAdminClient()
