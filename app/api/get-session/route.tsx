import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "crypto"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
})

function generateAccessCode(length = 6) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const bytes = randomBytes(length)
    let code = ""

    for (let i = 0; i < length; i++) {
        code += charset[bytes[i] % charset.length]
    }

    return code
}

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
    const { data: updated, error: updateErr } = await supabase
        .from("tradingbookings")
        .update({ paid: true })
        .eq("email", email)
        .select("id")

    if (updateErr) {
        console.error("[get-session] Failed updating user:", updateErr)
        return NextResponse.json({ error: "Database update failed" }, { status: 500 })
    }

    if (!updated?.length) {
        const accessCode = generateAccessCode(6)
        const { error: insertError } = await supabase.from("tradingbookings").insert({
            email,
            access_code: accessCode,
            paid: true,
        })

        if (insertError) {
            console.error("[get-session] Failed creating user:", insertError)
            return NextResponse.json({ error: "Database insert failed" }, { status: 500 })
        }
    }

    console.log("[get-session] payment synced", { email, hasPaid: true })

    return NextResponse.json({ email })
}
