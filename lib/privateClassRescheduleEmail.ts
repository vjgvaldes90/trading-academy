/**
 * Private Class reschedule notification (Resend) — bilingual ES/EN.
 * Join URL only; never start_url, password, or secrets.
 */

import {
    PRIVATE_CLASS_TIME_ZONE,
    privateClassSlotToUtc,
} from "@/lib/privateClassRequests"

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

export type PrivateClassRescheduleEmailProps = {
    studentName?: string | null
    newDateYmd: string
    newTimeHms: string
    /** Student-safe Zoom join URL only. */
    zoomJoinUrl: string | null
    durationHours?: number
}

/** Friendly date+time in America/New_York for email bodies. */
export function formatPrivateClassSlotForEmail(
    dateYmd: string,
    timeHms: string,
    locale: "es-US" | "en-US"
): string {
    const instant = privateClassSlotToUtc(dateYmd, timeHms)
    if (instant) {
        return new Intl.DateTimeFormat(locale, {
            timeZone: PRIVATE_CLASS_TIME_ZONE,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
        }).format(instant)
    }
    const time = timeHms.trim()
    const m = /^(\d{1,2}):(\d{2})/.exec(time)
    const hh = m ? m[1].padStart(2, "0") : "00"
    const mm = m ? m[2] : "00"
    return `${dateYmd.trim()} ${hh}:${mm} ET`
}

export function createPrivateClassRescheduleEmailHtml(props: PrivateClassRescheduleEmailProps): string {
    const name =
        typeof props.studentName === "string" && props.studentName.trim()
            ? props.studentName.trim()
            : "estudiante"
    const safeName = escapeHtml(name)
    const hours = props.durationHours ?? 2
    const slotEs = escapeHtml(
        formatPrivateClassSlotForEmail(props.newDateYmd, props.newTimeHms, "es-US")
    )
    const slotEn = escapeHtml(
        formatPrivateClassSlotForEmail(props.newDateYmd, props.newTimeHms, "en-US")
    )
    const joinUrl =
        typeof props.zoomJoinUrl === "string" && props.zoomJoinUrl.trim()
            ? props.zoomJoinUrl.trim()
            : null
    const safeJoin = joinUrl ? escapeHtml(joinUrl) : null

    const joinBlockEs = safeJoin
        ? `<p style="font-size:15px;color:#374151;margin:0 0 12px 0;line-height:1.6;">
              El enlace de Zoom <strong>sigue siendo el mismo</strong>.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px auto;">
              <tr>
                <td style="border-radius:10px;background:linear-gradient(180deg,#facc15 0%,#ca8a04 100%);">
                  <a href="${safeJoin}" style="display:inline-block;padding:14px 28px;color:#0f172a;font-weight:700;text-decoration:none;font-size:15px;">
                    Unirse a Zoom
                  </a>
                </td>
              </tr>
            </table>`
        : `<p style="font-size:15px;color:#6b7280;margin:0 0 28px 0;line-height:1.6;">
              El enlace de Zoom sigue siendo el mismo. Encuéntralo en tu panel de estudiante.
            </p>`

    const joinBlockEn = safeJoin
        ? `<p style="font-size:15px;color:#374151;margin:0 0 12px 0;line-height:1.6;">
              Your Zoom link <strong>remains the same</strong>.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 20px auto;">
              <tr>
                <td style="border-radius:10px;background:#0f172a;">
                  <a href="${safeJoin}" style="display:inline-block;padding:14px 28px;color:#f8fafc;font-weight:700;text-decoration:none;font-size:15px;">
                    Join Zoom
                  </a>
                </td>
              </tr>
            </table>`
        : `<p style="font-size:15px;color:#6b7280;margin:0 0 20px 0;line-height:1.6;">
              Your Zoom link remains the same. Find it in your student dashboard.
            </p>`

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;margin:0;padding:0;">
  <tr>
    <td style="padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding:32px 32px 12px 32px;text-align:center;">
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;">Smart Option Academy</p>
            <h1 style="font-size:22px;margin:0 0 16px 0;color:#111827;line-height:1.3;">
              Tu clase privada fue reprogramada
            </h1>
            <p style="font-size:15px;color:#374151;margin:0 0 8px 0;line-height:1.5;">Hola ${safeName},</p>
            <p style="font-size:15px;color:#6b7280;margin:0 0 16px 0;line-height:1.65;">
              La fecha y hora de tu clase privada 1:1 han cambiado.
            </p>
            <p style="font-size:16px;color:#111827;margin:0 0 8px 0;line-height:1.5;font-weight:700;">
              Nueva fecha y hora
            </p>
            <p style="font-size:15px;color:#1d4ed8;margin:0 0 8px 0;line-height:1.5;font-weight:600;">
              ${slotEs}
            </p>
            <p style="font-size:14px;color:#6b7280;margin:0 0 20px 0;">Duración: ${hours} horas · America/New_York (ET)</p>
            ${joinBlockEs}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px 32px;border-top:1px solid #e5e7eb;">
            <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 10px 0;">English</p>
            <h2 style="font-size:18px;margin:0 0 12px 0;color:#111827;">Your private class was rescheduled</h2>
            <p style="font-size:14px;color:#6b7280;margin:0 0 12px 0;line-height:1.6;">
              Your 1:1 private class date and time have changed.
            </p>
            <p style="font-size:14px;color:#111827;margin:0 0 6px 0;font-weight:700;">New date &amp; time</p>
            <p style="font-size:14px;color:#1d4ed8;margin:0 0 8px 0;font-weight:600;">${slotEn}</p>
            <p style="font-size:13px;color:#6b7280;margin:0 0 16px 0;">Duration: ${hours} hours · America/New_York (ET)</p>
            ${joinBlockEn}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}
