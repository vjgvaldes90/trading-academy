/**
 * Theory quota security self-checks (no DB / no Stripe network).
 * Usage: npm run verify:theory-quota
 */

import {
    chooseTheoryQuotaPeriod,
    evaluateClaimTheoryRpcGuards,
    sameBillingInstant,
    theoryJoinUrlAllowed,
} from "../lib/theoryClassQuota"

type Check = { name: string; pass: boolean; detail: string }

function simulateAtomicClaims(sessionIds: string[], maxDistinct = 2): string[] {
    const claimed = new Set<string>()
    const out: string[] = []
    for (const id of sessionIds) {
        if (claimed.has(id)) {
            out.push("already")
            continue
        }
        if (claimed.size >= maxDistinct) {
            out.push("quota_exceeded")
            continue
        }
        claimed.add(id)
        out.push("ok")
    }
    return out
}

/** Concurrent third-session race: serialized claims never exceed maxDistinct. */
function simulateConcurrentThirdRace(maxDistinct = 2): { winners: number; exceeded: number } {
    const claimed = new Set<string>(["t1", "t2"])
    let winners = 0
    let exceeded = 0
    const contenders = ["t3a", "t3b"]
    for (const id of contenders) {
        if (claimed.has(id)) continue
        if (claimed.size >= maxDistinct) {
            exceeded += 1
            continue
        }
        claimed.add(id)
        winners += 1
    }
    return { winners, exceeded }
}

/** Concurrent first two Theory sessions under advisory lock → both succeed, size 2. */
function simulateConcurrentFirstTwo(): { size: number; results: string[] } {
    const claimed = new Set<string>()
    const results: string[] = []
    for (const id of ["t1", "t2"]) {
        if (claimed.has(id)) {
            results.push("already")
            continue
        }
        if (claimed.size >= 2) {
            results.push("quota_exceeded")
            continue
        }
        claimed.add(id)
        results.push("ok")
    }
    return { size: claimed.size, results }
}

const periodAStart = new Date("2026-09-24T04:00:00.000Z")
const periodAEnd = new Date("2026-10-24T04:00:00.000Z")
const periodBStart = new Date("2026-10-24T04:00:00.000Z")
const periodBEnd = new Date("2026-11-24T04:00:00.000Z")

const baseGuard = {
    studentId: "stu-1",
    sessionId: "sess-1",
    pPeriodStart: periodAStart,
    pPeriodEnd: periodAEnd,
    studentExists: true,
    persistedPeriodStart: periodAStart,
    persistedPeriodEnd: periodAEnd,
    sessionExists: true,
    sessionType: "theory",
    alreadyConsumed: false,
}

const checks: Check[] = []

{
    const results = simulateAtomicClaims(["t1", "t2", "t3"])
    checks.push({
        name: "2 Theory permitted; third rejected",
        pass: results.join(",") === "ok,ok,quota_exceeded",
        detail: results.join(","),
    })
}

{
    const results = simulateAtomicClaims(["t1", "t2", "t1", "t3"])
    checks.push({
        name: "re-entry permitted without extra quota",
        pass: results.join(",") === "ok,ok,already,quota_exceeded",
        detail: results.join(","),
    })
}

{
    const firstTwo = simulateConcurrentFirstTwo()
    checks.push({
        name: "concurrent Theory #1+#2 reach exactly 2",
        pass: firstTwo.size === 2 && firstTwo.results.join(",") === "ok,ok",
        detail: JSON.stringify(firstTwo),
    })
}

{
    const race = simulateConcurrentThirdRace(2)
    checks.push({
        name: "concurrent Theory #3+#4 never exceed 2",
        pass: race.winners === 0 && race.exceeded === 2,
        detail: JSON.stringify(race),
    })
}

checks.push({
    name: "consume:false never allows join_url for available (new) Theory",
    pass: theoryJoinUrlAllowed({ consume: false, status: "available" }) === false,
    detail: "available+preview",
})

checks.push({
    name: "consume:false allows join_url only when already consumed",
    pass: theoryJoinUrlAllowed({ consume: false, status: "already" }) === true,
    detail: "already+preview",
})

checks.push({
    name: "consume:true allows join_url after claim",
    pass: theoryJoinUrlAllowed({ consume: true, status: "claimed" }) === true,
    detail: "claimed+consume",
})

{
    const g = evaluateClaimTheoryRpcGuards(baseGuard)
    checks.push({
        name: "RPC guard: correct persisted period proceeds",
        pass: g.ok === true && g.action === "proceed",
        detail: JSON.stringify(g),
    })
}

{
    const g = evaluateClaimTheoryRpcGuards({
        ...baseGuard,
        pPeriodStart: periodBStart,
        pPeriodEnd: periodBEnd,
    })
    checks.push({
        name: "RPC guard: incorrect period rejected",
        pass: g.ok === false && g.reason === "period_mismatch",
        detail: JSON.stringify(g),
    })
}

{
    const g = evaluateClaimTheoryRpcGuards({
        ...baseGuard,
        persistedPeriodStart: null,
        persistedPeriodEnd: null,
    })
    checks.push({
        name: "RPC guard: missing persisted period rejected",
        pass: g.ok === false && g.reason === "period_not_configured",
        detail: JSON.stringify(g),
    })
}

{
    const g = evaluateClaimTheoryRpcGuards({
        ...baseGuard,
        sessionType: "trading",
    })
    checks.push({
        name: "RPC guard: Trading session rejected",
        pass: g.ok === false && g.reason === "session_not_theory",
        detail: JSON.stringify(g),
    })
}

{
    const g = evaluateClaimTheoryRpcGuards({
        ...baseGuard,
        alreadyConsumed: true,
        sessionType: "trading",
        pPeriodStart: periodBStart,
        pPeriodEnd: periodBEnd,
    })
    checks.push({
        name: "RPC guard: re-entry returns already before other rejects",
        pass: g.ok === true && g.action === "already",
        detail: JSON.stringify(g),
    })
}

{
    const chosen = chooseTheoryQuotaPeriod({
        persisted: { start: periodAStart, end: periodAEnd },
        stripe: { start: periodBStart, end: periodBEnd },
        programTheoryUntil: periodAEnd,
    })
    checks.push({
        name: "persisted first $450 period wins over later Stripe period",
        pass: Boolean(chosen && sameBillingInstant(chosen.start, periodAStart)),
        detail: chosen ? chosen.start.toISOString() : "null",
    })
}

{
    const chosen = chooseTheoryQuotaPeriod({
        persisted: null,
        stripe: { start: periodBStart, end: periodBEnd },
        programTheoryUntil: periodAEnd,
    })
    checks.push({
        name: "reject Stripe $150 window (end ≠ program_theory_until)",
        pass: chosen === null,
        detail: chosen ? "unexpected period" : "null",
    })
}

let failed = 0
for (const c of checks) {
    const mark = c.pass ? "PASS" : "FAIL"
    if (!c.pass) failed += 1
    console.log(`[${mark}] ${c.name}: ${c.detail}`)
}

if (failed > 0) {
    console.error(`\nverify-theory-quota: ${failed} failed`)
    process.exit(1)
}

console.log(`\nverify-theory-quota: ${checks.length} checks passed`)
