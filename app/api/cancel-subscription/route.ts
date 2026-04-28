import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseServiceRoleClient } from "@/lib/access"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
    try {
        const body = (await req.json().catch(() => null)) as { email?: unknown } | null
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

        if (!email) {
            return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: student, error: readErr } = await supabase
            .from("trading_students")
            .select("subscription_id")
            .eq("email", email)
            .maybeSingle()

        if (readErr) {
            console.error("[cancel-subscription] failed to fetch student", { email, error: readErr })
            return NextResponse.json({ ok: false, error: "Database read failed" }, { status: 500 })
        }

        const subscriptionId =
            student && typeof student.subscription_id === "string" && student.subscription_id.trim()
                ? student.subscription_id.trim()
                : null

        if (!subscriptionId) {
            return NextResponse.json({ ok: false, error: "No subscription_id found" }, { status: 400 })
        }

        await stripe.subscriptions.cancel(subscriptionId)

        const { error: updateErr } = await supabase
            .from("trading_students")
            .update({ subscription_status: "cancelled" })
            .eq("email", email)

        if (updateErr) {
            console.error("[cancel-subscription] failed to update subscription_status", {
                email,
                subscriptionId,
                error: updateErr,
            })
            return NextResponse.json({ ok: false, error: "Database update failed" }, { status: 500 })
        }

        return NextResponse.json({ ok: true, subscription_id: subscriptionId, status: "cancelled" })
    } catch (error) {
        console.error("[cancel-subscription] unexpected error", error)
        return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
    }
}
