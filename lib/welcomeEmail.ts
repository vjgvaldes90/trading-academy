const ACADEMY_NAME = "Smart Option Academy"

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

export type WelcomeEmailProps = {
    name: string
    email: string
    magicLink: string
    accessCode: string
}

/**
 * Branded welcome email — inline styles only (email clients).
 */
export function createWelcomeEmail({ name, email, magicLink, accessCode }: WelcomeEmailProps): string {
    void email
    const safeName = escapeHtml(name.trim() || "estudiante")
    const safeCode = escapeHtml(accessCode.trim())
    // magicLink is built server-side; encode for attribute safety
    const safeHref = escapeHtml(magicLink)

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;margin:0;padding:0;">
  <tr>
    <td style="padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:16px;padding:0;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding:32px 32px 28px 32px;text-align:center;">
            <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;">
              ${ACADEMY_NAME}
            </p>
            <h1 style="font-size:24px;margin:0 0 18px 0;color:#111827;line-height:1.3;">
              Bienvenido a Smart Option Academy
            </h1>
            <p style="font-size:16px;color:#374151;margin:0 0 10px 0;line-height:1.5;">
              Hola ${safeName},
            </p>
            <p style="font-size:15px;color:#6b7280;margin:0 0 28px 0;line-height:1.65;max-width:420px;margin-left:auto;margin-right:auto;">
              Tu acceso está listo. Puedes entrar directamente usando el botón de abajo o tu código de acceso.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 28px auto;">
              <tr>
                <td style="border-radius:999px;background:linear-gradient(90deg,#2563eb,#1d4ed8);">
                  <a href="${safeHref}" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">
                    Entrar a la Academia
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;color:#6b7280;margin:0 0 10px 0;">
              O usa este código de acceso:
            </p>
            <div style="font-size:28px;font-weight:bold;letter-spacing:8px;padding:16px;border:1px dashed #d1d5db;border-radius:12px;color:#111827;margin:0 0 20px 0;">
              ${safeCode}
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
            <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
              Si no solicitaste esto, puedes ignorar este mensaje.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`.trim()
}
