"use client"

import { createClient } from "@supabase/supabase-js"
import { requireBrowserSupabaseEnv } from "@/lib/supabase/publicEnv"
import { useState } from "react"

type Props = {
    sessionId: string | null
    email: string | null
}

/**
 * Temporary dev-only: direct anon insert to verify client + RLS (no API routes).
 */
export default function BookingInsertTestButton({ sessionId, email }: Props) {
    const [loading, setLoading] = useState(false)

    if (process.env.NODE_ENV !== "development") {
        return null
    }

    const run = async () => {
        console.log("CLICK")
        setLoading(true)
        try {
            const { url, anonKey } = requireBrowserSupabaseEnv()
            const sb = createClient(url, anonKey)
            const sid = sessionId?.trim() ?? ""
            const em = email?.trim().toLowerCase() ?? ""
            if (!sid || !em) {
                console.log("ERROR", { message: "missing sessionId or email", sid, em })
                return
            }
            const { data, error } = await sb
                .from("tradingbookings")
                .insert({ session_id: sid, email: em })
                .select("id")
                .single()
            console.log("DATA", data)
            if (error) {
                console.log("ERROR", error)
            }
        } catch (e) {
            console.error("ERROR", e)
        } finally {
            console.log("FINISHED")
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                marginTop: "var(--ds-3)",
                padding: "var(--ds-2)",
                borderRadius: 8,
                border: "1px dashed #f59e0b",
                fontSize: "0.75rem",
                color: "var(--ds-text-muted)",
            }}
        >
            <span style={{ display: "block", marginBottom: 6 }}>Dev: isolated insert test</span>
            <button
                type="button"
                onClick={() => void run()}
                disabled={loading || !sessionId || !email}
                style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: 8,
                    border: "1px solid #f59e0b",
                    background: "#fff7ed",
                    cursor: loading ? "wait" : "pointer",
                    fontSize: "0.75rem",
                }}
            >
                {loading ? "Running…" : "Run test insert"}
            </button>
        </div>
    )
}
