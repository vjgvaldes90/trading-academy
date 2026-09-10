/**
 * Verify Private Class auto-completion timing rules (no DB).
 * Usage: npm run verify:private-class-completion
 */

import { runPrivateClassCompletionSelfChecks } from "../lib/privateClassCompletionLogic"

const { ok, results } = runPrivateClassCompletionSelfChecks()

for (const r of results) {
    const mark = r.pass ? "PASS" : "FAIL"
    console.log(`[${mark}] ${r.name}: ${r.detail}`)
}

if (!ok) {
    console.error("\nPrivate class completion self-checks FAILED")
    process.exit(1)
}

console.log("\nPrivate class completion self-checks PASSED")
process.exit(0)
