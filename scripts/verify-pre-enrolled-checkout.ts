/**
 * Verify pre_enrolled → Checkout gate rules (no Stripe session create).
 * Usage: npm run verify:pre-enrolled-checkout
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
    runPreEnrolledCheckoutSelfChecks,
    sampleAfterOfficialLaunch,
    sampleBeforeOfficialLaunch,
    sampleOnOfficialLaunch,
} from "../lib/preEnrolledCheckoutGate"
import { evaluateAcademyAccess } from "../lib/studentAcademyAccess"

/** Load `.env.local` into process.env when present (no new dependency). */
function loadEnvLocal(): void {
    const path = resolve(process.cwd(), ".env.local")
    if (!existsSync(path)) return
    const text = readFileSync(path, "utf8")
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eq = trimmed.indexOf("=")
        if (eq <= 0) continue
        const key = trimmed.slice(0, eq).trim()
        const value = trimmed.slice(eq + 1).trim()
        if (!(key in process.env) || !process.env[key]) {
            process.env[key] = value
        }
    }
}

loadEnvLocal()

const { ok, results } = runPreEnrolledCheckoutSelfChecks()

for (const r of results) {
    const mark = r.pass ? "PASS" : "FAIL"
    console.log(`[${mark}] ${r.name}: ${r.detail}`)
}

const pre = {
    access_type: "pre_enrolled",
    plan: "full_program",
    access_code: "K7MC6L",
    is_active: true,
    subscription_id: null,
    subscription_status: null,
}

const academyChecks = [
    {
        name: "evaluateAcademyAccess before launch → ok",
        pass: evaluateAcademyAccess(pre, sampleBeforeOfficialLaunch()).ok === true,
    },
    {
        name: "evaluateAcademyAccess on launch → unpaid",
        pass:
            evaluateAcademyAccess(pre, sampleOnOfficialLaunch()).ok === false &&
            evaluateAcademyAccess(pre, sampleOnOfficialLaunch()).reason === "unpaid",
    },
    {
        name: "evaluateAcademyAccess after launch → unpaid",
        pass:
            evaluateAcademyAccess(pre, sampleAfterOfficialLaunch()).ok === false &&
            evaluateAcademyAccess(pre, sampleAfterOfficialLaunch()).reason === "unpaid",
    },
    {
        name: "evaluateAcademyAccess paid after launch → ok",
        pass:
            evaluateAcademyAccess(
                {
                    access_type: "paid",
                    access_code: "PAID01",
                    is_active: true,
                },
                sampleAfterOfficialLaunch()
            ).ok === true,
    },
]

for (const c of academyChecks) {
    const mark = c.pass ? "PASS" : "FAIL"
    console.log(`[${mark}] ${c.name}`)
}

const allOk = ok && academyChecks.every((c) => c.pass)

if (!allOk) {
    console.error("\nPre-enrolled checkout self-checks FAILED")
    process.exit(1)
}

console.log("\nPre-enrolled checkout self-checks PASSED")
process.exit(0)
