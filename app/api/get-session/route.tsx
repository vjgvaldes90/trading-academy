import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { setAuthCookiesForPaidUser } from "@/lib/authCookies"
import { computeRenewalAccessExpiresAtIso } from "@/lib/studentSubscriptionRenewal"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
})

export async function POST(req: Request) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
        return NextResponse.json({ error: "Missing server configuration" }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    const sessionId =
        typeof body?.session_id === "string"
            ? body.session_id
            : typeof body?.sessionId === "string"
              ? body.sessionId
              : null

    if (!sessionId) {
        return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const raw =
        session.customer_details?.email?.trim() ||
        session.customer_email?.trim() ||
        ""
    const email = raw ? raw.toLowerCase() : null

    if (!email) {
        return NextResponse.json({ error: "No email found in Stripe session" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: student, error: fetchErr } = await supabase
        .from("trading_students")
        .select("access_code")
        .eq("email", email)
        .maybeSingle()

    if (fetchErr) {
        console.error("[get-session] trading_students lookup:", fetchErr)
        return NextResponse.json({ error: "Database read failed" }, { status: 500 })
    }

    if (!student?.access_code || String(student.access_code).trim().length === 0) {
        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const accessExpiresAt = computeRenewalAccessExpiresAtIso(null)
        const { error: upsertErr } = await supabase.from("trading_students").upsert(
            {
                email,
                access_code: accessCode,
                access_type: "paid",
                is_active: true,
                access_expires_at: accessExpiresAt,
            },
            { onConflict: "email" }
        )
        if (upsertErr) {
            console.error("[get-session] trading_students upsert:", upsertErr)
            return NextResponse.json({ error: "Database update failed" }, { status: 500 })
        }
    }

    console.log("[get-session] payment synced", { email })

    const res = NextResponse.json({ email })
    setAuthCookiesForPaidUser(res, email)
    return res
}
