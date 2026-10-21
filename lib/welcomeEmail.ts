import { zoomDesktopDownloadUrl } from "@/lib/classroomZoomResources"

const ACADEMY_NAME = "Smart Option Academy"

/** Official Zoom Workplace desktop client. Same URL the classroom already uses. */
export const ZOOM_WORKPLACE_DOWNLOAD_URL = zoomDesktopDownloadUrl()

/** Official Webull app download page. */
export const WEBULL_DOWNLOAD_URL = "https://www.webull.com/download"

const NO_DEPOSIT_REMINDER =
    "You do not need to deposit funds or place trades before your first class unless instructed by your instructor."

const TEAM_CLOSING = "The Smart Option Academy Team"

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

export type WelcomeEmailPlan = "full_program" | "trading_only"

export type WelcomeEmailProps = {
    name: string
    email: string
    /** Real login URL from the app config. Never a guessed link. */
    magicLink: string
    /** Real access code already saved for this student. Empty hides the code block. */
    accessCode: string
    /** Omitted when the enrollment flow has no plan yet. */
    plan?: WelcomeEmailPlan | null
    /** Official site origin, no trailing slash. */
    siteUrl?: string | null
    /** When true, the student still has to enter name and phone before the dashboard. */
    needsProfileCompletion?: boolean
    /** Shown only when a support inbox is configured. Also used as Reply-To by the sender. */
    supportEmail?: string | null
}

export function welcomeProgramLabel(plan: WelcomeEmailPlan | null | undefined): string | null {
    if (plan === "full_program") return "Full Program"
    if (plan === "trading_only") return "Trading Only"
    return null
}

type WelcomeCopy = {
    greetingName: string
    program: string | null
    loginUrl: string
    accessCode: string
    siteUrl: string
    needsProfileCompletion: boolean
    supportEmail: string
}

function welcomeCopy(props: WelcomeEmailProps): WelcomeCopy {
    const site = typeof props.siteUrl === "string" ? props.siteUrl.trim().replace(/\/$/, "") : ""
    const support = typeof props.supportEmail === "string" ? props.supportEmail.trim() : ""
    return {
        greetingName: props.name.trim() || "there",
        program: welcomeProgramLabel(props.plan),
        loginUrl: props.magicLink.trim(),
        accessCode: props.accessCode.trim(),
        siteUrl: site,
        needsProfileCompletion: props.needsProfileCompletion !== false,
        supportEmail: support,
    }
}

function checklistLines(copy: WelcomeCopy): string[] {
    const lines = [
        "Install Zoom Workplace from the official download page and sign in.",
        "Install Webull from the official download page and sign in.",
        "Sign in to Smart Option Academy with the access code in this email.",
    ]
    if (copy.needsProfileCompletion) {
        lines.push(
            "Complete your profile with your first name, last name, and phone number so your dashboard opens."
        )
    }
    lines.push("Join your first class from the academy a few minutes before it starts.")
    return lines
}

/** Plain-text welcome. Same facts as the HTML version. */
export function createWelcomeEmailText(props: WelcomeEmailProps): string {
    const copy = welcomeCopy(props)
    const lines: string[] = [
        "Welcome to Smart Option Academy",
        "",
        `Hi ${copy.greetingName},`,
        "",
    ]
    if (copy.program) {
        lines.push(`You're enrolled in the ${copy.program}.`, "")
    }
    lines.push(
        "Your account is ready. Sign in with the link below and the access code in this email.",
        "",
        `Sign in: ${copy.loginUrl}`,
        ""
    )
    if (copy.accessCode) {
        lines.push("Your access code", copy.accessCode, "")
    }
    if (copy.needsProfileCompletion) {
        lines.push(
            "After you sign in, complete your profile with your first name, last name, and phone number. That opens your dashboard so you can start your classes.",
            ""
        )
    } else {
        lines.push("After you sign in, open your dashboard and start your classes.", "")
    }
    if (copy.siteUrl) {
        lines.push(`Academy website: ${copy.siteUrl}`, "")
    }
    lines.push(
        "Before your first class, install both apps from their official pages:",
        "",
        `Zoom Workplace: ${ZOOM_WORKPLACE_DOWNLOAD_URL}`,
        `Webull: ${WEBULL_DOWNLOAD_URL}`,
        "",
        "First-class preparation checklist",
        ...checklistLines(copy).map((line) => `- ${line}`),
        "",
        NO_DEPOSIT_REMINDER,
        "",
        TEAM_CLOSING
    )
    if (copy.supportEmail) {
        lines.push("", "Need help? Reply to this email and we'll get back to you.")
    }
    return lines.join("\n")
}

/**
 * English enrollment welcome. Inline styles only (email clients).
 * Does not invent codes, passwords, or billing details.
 */
export function createWelcomeEmail(props: WelcomeEmailProps): string {
    const copy = welcomeCopy(props)
    const safeName = escapeHtml(copy.greetingName)
    const safeLogin = escapeHtml(copy.loginUrl)
    const safeCode = escapeHtml(copy.accessCode)
    const safeSite = copy.siteUrl ? escapeHtml(copy.siteUrl) : ""
    const safeZoom = escapeHtml(ZOOM_WORKPLACE_DOWNLOAD_URL)
    const safeWebull = escapeHtml(WEBULL_DOWNLOAD_URL)

    const programLine = copy.program
        ? `<p style="font-size:15px;color:#cbd5e1;margin:0 0 16px 0;line-height:1.65;">
              You're enrolled in the <strong style="color:#f8fafc;">${escapeHtml(copy.program)}</strong>.
            </p>`
        : ""

    const codeBlock =
        copy.accessCode.length > 0
            ? `<p style="font-size:14px;color:#cbd5e1;margin:0 0 8px 0;">Your access code</p>
            <div style="font-size:26px;font-weight:bold;letter-spacing:6px;padding:14px 16px;border:1px dashed #334155;border-radius:12px;color:#f8fafc;background:#0b1220;margin:0 0 20px 0;">
              ${safeCode}
            </div>`
            : ""

    const profileStep = copy.needsProfileCompletion
        ? `<p style="font-size:15px;color:#cbd5e1;margin:0 0 16px 0;line-height:1.65;">
              After you sign in, complete your profile with your first name, last name, and phone number.
              That opens your dashboard so you can start your classes.
            </p>`
        : `<p style="font-size:15px;color:#cbd5e1;margin:0 0 16px 0;line-height:1.65;">
              After you sign in, open your dashboard and start your classes.
            </p>`

    const siteLine = safeSite
        ? `<p style="font-size:14px;color:#94a3b8;margin:0 0 16px 0;line-height:1.6;">
              Academy website: <a href="${safeSite}" style="color:#93c5fd;text-decoration:underline;">${safeSite}</a>
            </p>`
        : ""

    const checklist = checklistLines(copy)
        .map(
            (line) =>
                `<li style="margin:0 0 8px 0;color:#cbd5e1;font-size:15px;line-height:1.55;">${escapeHtml(line)}</li>`
        )
        .join("")

    const supportLine = copy.supportEmail
        ? `<p style="font-size:14px;color:#94a3b8;margin:16px 0 0 0;line-height:1.6;">
              Need help? Reply to this email and we'll get back to you.
            </p>`
        : ""

    return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#070b14;margin:0;padding:0;">
  <tr>
    <td style="padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background-color:#0f172a;border:1px solid #1e293b;border-radius:16px;">
        <tr>
          <td style="padding:28px 20px 24px 20px;">
            <p style="color:#93c5fd;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px 0;">
              ${ACADEMY_NAME}
            </p>
            <h1 style="font-size:24px;margin:0 0 16px 0;color:#f8fafc;line-height:1.3;">
              Welcome to Smart Option Academy
            </h1>
            <p style="font-size:16px;color:#e2e8f0;margin:0 0 10px 0;line-height:1.5;">
              Hi ${safeName},
            </p>
            ${programLine}
            <p style="font-size:15px;color:#cbd5e1;margin:0 0 22px 0;line-height:1.65;">
              Your account is ready. Sign in with the button below and the access code in this email.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">
              <tr>
                <td style="border-radius:999px;background-color:#2563eb;">
                  <a href="${safeLogin}" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">
                    Sign in to the Academy
                  </a>
                </td>
              </tr>
            </table>
            ${codeBlock}
            ${profileStep}
            ${siteLine}
            <p style="font-size:16px;font-weight:bold;color:#f8fafc;margin:8px 0 8px 0;">Before your first class</p>
            <p style="font-size:15px;color:#cbd5e1;margin:0 0 12px 0;line-height:1.65;">
              Install both apps from their official pages:
            </p>
            <p style="font-size:15px;color:#e2e8f0;margin:0 0 6px 0;line-height:1.55;">
              <strong>Zoom Workplace</strong><br />
              <a href="${safeZoom}" style="color:#93c5fd;text-decoration:underline;word-break:break-all;">${safeZoom}</a>
            </p>
            <p style="font-size:15px;color:#e2e8f0;margin:0 0 16px 0;line-height:1.55;">
              <strong>Webull</strong><br />
              <a href="${safeWebull}" style="color:#93c5fd;text-decoration:underline;word-break:break-all;">${safeWebull}</a>
            </p>
            <p style="font-size:16px;font-weight:bold;color:#f8fafc;margin:0 0 8px 0;">First-class preparation checklist</p>
            <ul style="margin:0 0 16px 18px;padding:0;">
              ${checklist}
            </ul>
            <p style="font-size:15px;color:#e2e8f0;margin:0 0 18px 0;line-height:1.65;">
              ${escapeHtml(NO_DEPOSIT_REMINDER)}
            </p>
            <p style="font-size:15px;color:#f8fafc;margin:0;line-height:1.5;">
              ${TEAM_CLOSING}
            </p>
            ${supportLine}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`.trim()
}
