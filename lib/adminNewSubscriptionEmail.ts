const ACADEMY_NAME = "Smart Option Academy"

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

export type AdminNewSubscriptionEmailProps = {
    studentName: string | null
    studentEmail: string
    /** Display label, e.g. "Full Program" / "Trading Only" */
    planLabel: string
    subscriptionId: string
    stripePriceId: string | null
    periodStartIso: string | null
    periodEndIso: string | null
    notifiedAtIso: string
}

function formatDisplayDate(iso: string | null): string {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return escapeHtml(iso)
    return escapeHtml(
        d.toLocaleString("en-US", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
        })
    )
}

function row(label: string, value: string): string {
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;width:42%;vertical-align:top;">
          ${escapeHtml(label)}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:600;word-break:break-all;">
          ${value}
        </td>
      </tr>`
}

/**
 * Internal IT notification — new paid subscription activated.
 * Inline styles only (email clients). Not the student welcome template.
 */
export function createAdminNewSubscriptionEmailHtml(
    props: AdminNewSubscriptionEmailProps
): string {
    const name =
        typeof props.studentName === "string" && props.studentName.trim()
            ? escapeHtml(props.studentName.trim())
            : "—"
    const email = escapeHtml(props.studentEmail.trim().toLowerCase())
    const plan = escapeHtml(props.planLabel)
    const subId = escapeHtml(props.subscriptionId)
    const priceId =
        typeof props.stripePriceId === "string" && props.stripePriceId.trim()
            ? escapeHtml(props.stripePriceId.trim())
            : "—"

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;margin:0;padding:0;">
  <tr>
    <td style="padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:16px;padding:0;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding:32px 32px 28px 32px;">
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;text-align:center;">
              ${ACADEMY_NAME} · Internal
            </p>
            <h1 style="font-size:22px;margin:0 0 10px 0;color:#111827;line-height:1.3;text-align:center;">
              Nueva suscripción recibida
            </h1>
            <p style="font-size:14px;color:#6b7280;margin:0 0 24px 0;line-height:1.55;text-align:center;">
              Se activó una nueva suscripción pagada en la academia.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;">
              ${row("Nombre", name)}
              ${row("Email", email)}
              ${row("Programa", plan)}
              ${row("Subscription ID", subId)}
              ${row("Stripe Price ID", priceId)}
              ${row("Inicio del período", formatDisplayDate(props.periodStartIso))}
              ${row("Fin del período", formatDisplayDate(props.periodEndIso))}
              ${row("Notificación", formatDisplayDate(props.notifiedAtIso))}
            </table>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px 0;" />
            <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;text-align:center;">
              Notificación automática para IT · No responder a este correo.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`.trim()
}

export function buildAdminNewSubscriptionSubject(planLabel: string, studentEmail: string): string {
    const plan = planLabel.trim() || "Subscription"
    const email = studentEmail.trim().toLowerCase() || "unknown"
    return `Nueva suscripción — ${plan} — ${email}`
}
