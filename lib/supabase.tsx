import { createClient } from "@supabase/supabase-js"
import { requireBrowserSupabaseEnv } from "@/lib/supabase/publicEnv"

const { url: supabaseUrl, anonKey: supabaseAnonKey } = requireBrowserSupabaseEnv()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)