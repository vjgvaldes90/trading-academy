import { Resend } from "resend"
import { getSiteBaseUrl } from "@/lib/supabaseMagicLink"
import { createWelcomeEmail } from "@/lib/welcomeEmail"

/** Must match a verified domain in Resend (server-only; never import this module from client code). */
const RESEND_FROM = "Smart Option Academy <tony@smartoptionacademy.com>"

type SendEmailResult =
    | { ok: true; id: string | null }
    | { ok: false; error: string }

/**
 * @param to - recipient email
 * @param code - access code (also accessCode in template)
 * @param name - optional display name for greeting
 * @param magicLoginLink - optional; Supabase magic link, or omitted to use app `/login` (Resend-only flow)
 */
export async function sendEmail(
    to: string,
    code: string,
    name?: string,
    magicLoginLink?: string
): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        const message = "Missing RESEND_API_KEY"
        console.error("[resend] " + message)
        return { ok: false, error: message }
    }

    const resend = new Resend(apiKey.trim())

    if (typeof to !== "string" || to.trim().length === 0) {
        const message = "sendEmail requires a non-empty string `to`"
        console.error("[resend] Invalid recipient", { to, typeofTo: typeof to })
        return { ok: false, error: message }
    }

    const trimmedTo = to.trim()
    const deliveryTo = trimmedTo

    const magicLink =
        typeof magicLoginLink === "string" && magicLoginLink.trim().length > 0
            ? magicLoginLink.trim().replace(/\/$/, "")
            : `${getSiteBaseUrl()}/login`

    const displayName =
        typeof name === "string" && name.trim().length > 0 ? name.trim() : "estudiante"

    const html = createWelcomeEmail({
        name: displayName,
        email: deliveryTo,
        magicLink,
        accessCode: code,
    })

    try {
        const { data, error } = await resend.emails.send({
            from: RESEND_FROM,
            to: deliveryTo,
            subject: "Accede a Smart Option Academy 🚀",
            html,
        })

        if (error) {
            console.error("[resend] FULL ERROR:", JSON.stringify(error, null, 2))
            const message = typeof error.message === "string" ? error.message : "Resend send failed"
            return { ok: false, error: message }
        }

        console.log("[resend] Email sent successfully", {
            to: deliveryTo,
            id: data?.id ?? null,
        })

        return { ok: true, id: data?.id ?? null }
    } catch (err) {
        const forLog =
            err instanceof Error
                ? { message: err.message, name: err.name, stack: err.stack }
                : err
        console.error("[resend] FULL ERROR:", JSON.stringify(forLog, null, 2))
        const message = err instanceof Error ? err.message : "Unknown Resend error"
        return { ok: false, error: message }
    }
}
