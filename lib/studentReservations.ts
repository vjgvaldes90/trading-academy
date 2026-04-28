/** Minimal row shape for “does this user have a booking for this session?”. */
export type ReservationRef = {
    session_id: string
    email: string
}

/**
 * True when `reservations` includes a row for this session and the same student email.
 * Use with `myBookings` from the dashboard (sourced from GET /api/my-bookings).
 */
export function hasReservationForSession(
    reservations: readonly ReservationRef[],
    sessionId: string,
    userEmail: string | null | undefined
): boolean {
    const u = userEmail?.trim().toLowerCase() ?? ""
    if (!u) return false
    return reservations.some(
        (r) => r.session_id === sessionId && r.email.trim().toLowerCase() === u
    )
}
