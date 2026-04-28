import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseServiceRoleClient } from "@/lib/access"
import { computeRefundPreviewFromSubscription } from "@/lib/adminSubscriptionRefundPreview"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
})

export async function POST(req: Request) {
    try {
        console.log("🔥 ADMIN CANCEL START")
        const body = (await req.json().catch(() => null)) as { userId?: unknown } | null
        const userId = typeof body?.userId === "string" ? body.userId.trim() : ""

        if (!userId) {
            return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 })
        }

        const supabase = createSupabaseServiceRoleClient()
        const { data: student, error: readErr } = await supabase
            .from("trading_students")
            .select("subscription_id")
            .eq("id", userId)
            .maybeSingle()

        if (readErr) {
            console.error("[admin/cancel-subscription] fetch student", { userId, error: readErr })
            return NextResponse.json({ ok: false, error: "Database read failed" }, { status: 500 })
        }
        console.log("USER:", student)

        const subscriptionId =
            student &&
            typeof (student as { subscription_id?: unknown }).subscription_id === "string" &&
            String((student as { subscription_id: string }).subscription_id).trim()
                ? String((student as { subscription_id: string }).subscription_id).trim()
                : null

        if (!subscriptionId) {
            return NextResponse.json({ ok: false, error: "No subscription_id for user" }, { status: 400 })
        }

        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription
        console.log("SUBSCRIPTION:", subscription)

        const invoiceId =
            typeof subscription.latest_invoice === "string"
                ? subscription.latest_invoice
                : subscription.latest_invoice?.id

        if (!invoiceId) {
            throw new Error("No invoice ID found")
        }

        const invoice = await stripe.invoices.retrieve(invoiceId, {
            expand: ["payment_intent"],
        })

        const preview = computeRefundPreviewFromSubscription(subscription, invoice)
        const { refund_amount_cents: refundAmount, ratio } = preview
        console.log("INVOICE:", invoice)
        console.log("PAYMENT INTENT:", (invoice as Stripe.Invoice & { payment_intent?: unknown }).payment_intent)

        let paymentIntentId: string | null = null
        if ((invoice as Stripe.Invoice & { payment_intent?: unknown }).payment_intent) {
            paymentIntentId =
                typeof (invoice as Stripe.Invoice & { payment_intent?: unknown }).payment_intent === "string"
                    ? ((invoice as Stripe.Invoice & { payment_intent?: string }).payment_intent ?? null)
                    : (
                          invoice as Stripe.Invoice & {
                              payment_intent?: { id?: string } | null
                          }
                      ).payment_intent?.id ?? null
        }

        if (!invoice.amount_paid || invoice.amount_paid <= 0) {
            console.log("No amount paid, skipping refund")
        }

        if (refundAmount > 0) {
            try {
                let chargeId: string | undefined
                if (!paymentIntentId) {
                    const customerId =
                        typeof subscription.customer === "string"
                            ? subscription.customer
                            : subscription.customer && typeof subscription.customer === "object" && "id" in subscription.customer
                              ? subscription.customer.id
                              : null
                    if (!customerId) {
                        throw new Error("No charge found")
                    }
                    const charges = await stripe.charges.list({
                        customer: customerId,
                        limit: 1,
                    })

                    chargeId = charges.data[0]?.id

                    if (!chargeId) {
                        throw new Error("No charge found")
                    }
                }

                if (paymentIntentId) {
                    await stripe.refunds.create({
                        payment_intent: paymentIntentId,
                        amount: refundAmount,
                    })
                } else {
                    await stripe.refunds.create({
                        charge: chargeId,
                        amount: refundAmount,
                    })
                }
            } catch (refundErr) {
                console.error("[admin/cancel-subscription] stripe.refunds.create failed", {
                    userId,
                    subscriptionId,
                    refundAmount,
                    paymentIntentId,
                    error: refundErr,
                })
                return NextResponse.json({ ok: false, error: "Refund failed" }, { status: 502 })
            }
        }

        await stripe.subscriptions.cancel(subscriptionId)

        const { error: updateErr } = await supabase
            .from("trading_students")
            .update({
                subscription_status: "cancelled",
                is_active: false,
                access_type: "revoked",
            })
            .eq("id", userId)

        if (updateErr) {
            console.error("[admin/cancel-subscription] supabase update failed", {
                userId,
                subscriptionId,
                error: updateErr,
            })
            return NextResponse.json({ ok: false, error: "Database update failed" }, { status: 500 })
        }

        return NextResponse.json({
            ok: true,
            subscription_id: subscriptionId,
            refund_amount_cents: refundAmount,
            ratio,
        })
    } catch (error) {
        console.error("❌ ADMIN CANCEL ERROR:", error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
