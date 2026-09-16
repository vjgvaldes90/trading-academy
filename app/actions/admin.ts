"use server"

import { getAuthorizedAdminEmailFromCookies } from "@/lib/adminAuth"

/** Verified `admin_session` email for admin UI display, or null when unauthenticated. */
export async function getAuthorizedAdminEmailAction(): Promise<string | null> {
    return getAuthorizedAdminEmailFromCookies()
}
