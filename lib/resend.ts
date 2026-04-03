import { Resend } from "resend"
import { createWelcomeEmail } from "@/lib/welcomeEmail"

type SendEmailResult =
    | { ok: true; id: string | null }
    | { ok: false; error: string }

/**
 * @param to - recipient email
 * @param code - access code (also accessCode in template)
 * @param name - optional display name for greeting
 * @param magicLoginLink - full magic-login URL with token
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

    const resend = new Resend(apiKey)

    if (typeof to !== "string" || to.trim().length === 0) {
        const message = "sendEmail requires a non-empty string `to`"
        console.error("[resend] Invalid recipient", { to, typeofTo: typeof to })
        return { ok: false, error: message }
    }

    const trimmedTo = to.trim()
    const deliveryTo = trimmedTo

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const defaultLoginLink = `${appUrl.replace(/\/$/, "")}/login?redirect=/dashboard`
    const magicLink = (magicLoginLink ?? defaultLoginLink).replace(/\/$/, "")

    const displayName =
        typeof name === "string" && name.trim().length > 0 ? name.trim() : "estudiante"

    const html = createWelcomeEmail({
        name: displayName,
        email: deliveryTo,
        magicLink,
        accessCode: code,
    })

    console.log("📧 Sending styled email to:", deliveryTo)

    try {
        const { data, error } = await resend.emails.send({
            from: "Smart Option Academy <onboarding@resend.dev>",
            to: deliveryTo,
            subject: "Accede a Smart Option Academy 🚀",
            html,
        })

        if (error) {
            const message = typeof error.message === "string" ? error.message : "Resend send failed"
            console.error("[resend] Email send failed", {
                requestedTo: trimmedTo,
                deliveryTo,
                error,
            })
            return { ok: false, error: message }
        }

        console.log("[resend] Email sent successfully", {
            requestedTo: trimmedTo,
            deliveryTo,
            id: data?.id ?? null,
        })

        return { ok: true, id: data?.id ?? null }

    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown Resend error"
        console.error("[resend] Email send threw exception", {
            requestedTo: trimmedTo,
            deliveryTo,
            err,
        })
        return { ok: false, error: message }
    }
}
