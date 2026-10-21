/**
 * Welcome-email rules. No Resend, no database, no real messages.
 * Usage: npm run verify:student-welcome
 */

import { completeStudentWelcomeAttempt, shouldSendStudentWelcome, type WelcomeEmailClaimState } from "../lib/studentWelcome"
import {
    createWelcomeEmail,
    createWelcomeEmailText,
    WEBULL_DOWNLOAD_URL,
    ZOOM_WORKPLACE_DOWNLOAD_URL,
} from "../lib/welcomeEmail"

type Check = { name: string; pass: boolean; detail: string }

const checks: Check[] = []

function check(name: string, pass: boolean, detail: string) {
    checks.push({ name, pass, detail })
    console.log(`[${pass ? "PASS" : "FAIL"}] ${name}: ${detail}`)
}

const loginUrl = "https://smartoptionacademy.com/login"
const siteUrl = "https://smartoptionacademy.com"
const code = "AB12CD"

const full = createWelcomeEmail({
    name: "Alex",
    email: "alex@example.com",
    magicLink: loginUrl,
    accessCode: code,
    plan: "full_program",
    siteUrl,
    needsProfileCompletion: true,
    supportEmail: "support@smartoptionacademy.com",
})

check("new full program email names the program", full.includes("Full Program"), "Full Program")
check("email includes the real access code", full.includes(code), code)
check("email includes the login url", full.includes(loginUrl), loginUrl)
check("email includes the site url", full.includes(siteUrl), siteUrl)
check("profile step is explained", full.includes("complete your profile"), "complete your profile")
check("reply help line when support is configured", full.includes("Reply to this email"), "reply")
check("email is English", full.includes("Welcome to Smart Option Academy") && !full.includes("Bienvenido"), "en")
check("email links Zoom Workplace", full.includes("Zoom Workplace") && full.includes(ZOOM_WORKPLACE_DOWNLOAD_URL), ZOOM_WORKPLACE_DOWNLOAD_URL)
check("email links Webull", full.includes("Webull") && full.includes(WEBULL_DOWNLOAD_URL), WEBULL_DOWNLOAD_URL)
check("email includes the first-class checklist", full.includes("First-class preparation checklist"), "checklist")
check(
    "email includes the no-deposit reminder",
    full.includes("do not need to deposit funds or place trades before your first class unless instructed by your instructor"),
    "no deposit"
)
check("email closes from the academy team", full.includes("The Smart Option Academy Team"), "closing")
const fullText = createWelcomeEmailText({
    name: "Alex",
    email: "alex@example.com",
    magicLink: loginUrl,
    accessCode: code,
    plan: "full_program",
    siteUrl,
    needsProfileCompletion: true,
    supportEmail: "support@smartoptionacademy.com",
})
check(
    "plain text matches the approved message",
    fullText.includes("Welcome to Smart Option Academy") &&
        fullText.includes(code) &&
        fullText.includes(loginUrl) &&
        fullText.includes("Full Program") &&
        fullText.includes("complete your profile") &&
        fullText.includes(ZOOM_WORKPLACE_DOWNLOAD_URL) &&
        fullText.includes(WEBULL_DOWNLOAD_URL) &&
        fullText.includes("First-class preparation checklist") &&
        fullText.includes("The Smart Option Academy Team"),
    "text"
)
check("recipient is not the admin inbox", !full.includes("it@smartoptionacademy.com"), "no admin to")

const trading = createWelcomeEmail({
    name: "Alex",
    email: "alex@example.com",
    magicLink: loginUrl,
    accessCode: code,
    plan: "trading_only",
    siteUrl,
    needsProfileCompletion: false,
})
check("trading only email names Trading Only", trading.includes("Trading Only") && !trading.includes("Full Program"), "Trading Only")
check("completed profile skips the profile step", !trading.includes("complete your profile") && trading.includes("start your classes"), "no profile step")
check("no support line when support email is absent", !trading.includes("Reply to this email"), "no reply")

const noPlan = createWelcomeEmail({
    name: "<b>Sam</b>",
    email: "sam@example.com",
    magicLink: loginUrl,
    accessCode: code,
    plan: null,
    siteUrl,
    needsProfileCompletion: true,
})
check("unknown plan does not invent a program", !noPlan.includes("You're enrolled in"), "no program")
check("name is escaped", noPlan.includes("Hi &lt;b&gt;Sam&lt;/b&gt;") && !noPlan.includes("<b>Sam</b>"), "escaped")

check(
    "new student should receive a welcome",
    shouldSendStudentWelcome({ studentExisted: false, welcomeEmailSentAt: null }),
    "send"
)
check(
    "existing student update does not send",
    !shouldSendStudentWelcome({ studentExisted: true, welcomeEmailSentAt: null }),
    "skip existing"
)
check(
    "already welcomed student does not send",
    !shouldSendStudentWelcome({
        studentExisted: false,
        welcomeEmailSentAt: "2026-10-20T12:00:00.000Z",
    }),
    "skip sent"
)

const state: WelcomeEmailClaimState = { welcomeEmailSentAt: null }
let sends = 0
const first = completeStudentWelcomeAttempt({
    studentExisted: false,
    state,
    sentAtIso: "2026-10-20T12:00:00.000Z",
    send: () => {
        sends += 1
        return { ok: true }
    },
})
const retry = completeStudentWelcomeAttempt({
    studentExisted: false,
    state,
    sentAtIso: "2026-10-20T12:00:01.000Z",
    send: () => {
        sends += 1
        return { ok: true }
    },
})
check("first enrollment emails the student", first.saved && first.emailed && sends === 1, JSON.stringify(first))
check("webhook retry does not send a second welcome", retry.skipped && !retry.emailed && sends === 1, JSON.stringify(retry))

const renewal = completeStudentWelcomeAttempt({
    studentExisted: true,
    state: { welcomeEmailSentAt: null },
    sentAtIso: "2026-10-20T12:00:02.000Z",
    send: () => {
        sends += 1
        return { ok: true }
    },
})
check("routine update of an existing student does not email", renewal.skipped && sends === 1, JSON.stringify(renewal))

const failed = completeStudentWelcomeAttempt({
    studentExisted: false,
    state: { welcomeEmailSentAt: null },
    sentAtIso: "2026-10-20T12:00:03.000Z",
    send: () => ({ ok: false }),
})
check(
    "email failure still keeps the student saved",
    failed.saved && !failed.emailed && !failed.skipped,
    JSON.stringify(failed)
)

const raced: WelcomeEmailClaimState = { welcomeEmailSentAt: null }
const a = completeStudentWelcomeAttempt({
    studentExisted: false,
    state: raced,
    sentAtIso: "2026-10-20T12:00:04.000Z",
    send: () => ({ ok: true }),
})
const b = completeStudentWelcomeAttempt({
    studentExisted: false,
    state: raced,
    sentAtIso: "2026-10-20T12:00:05.000Z",
    send: () => ({ ok: true }),
})
check("two overlapping sends produce one email", a.emailed && b.skipped, `${a.emailed}/${b.skipped}`)

const failedCount = checks.filter((c) => !c.pass).length
console.log(`\nverify-student-welcome: ${checks.length - failedCount} passed, ${failedCount} failed`)
if (failedCount > 0) process.exit(1)
