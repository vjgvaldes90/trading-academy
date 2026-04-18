"use client"

/**
 * Dev-only reminder: seat reservation must not run from login/purchase flows.
 * Real booking is only via dashboard `useBooking` → `/api/reserve-seat` + `/api/bookings`.
 */
export default function BookingInsertTestButton() {
    if (process.env.NODE_ENV !== "development") {
        return null
    }

    return (
        <div
            style={{
                marginTop: "var(--ds-3)",
                padding: "var(--ds-2)",
                borderRadius: 8,
                border: "1px dashed #94a3b8",
                fontSize: "0.75rem",
                color: "var(--ds-text-muted)",
            }}
        >
            Dev: usa el dashboard y &quot;Reservar&quot; para probar cupos (no desde aquí).
        </div>
    )
}
