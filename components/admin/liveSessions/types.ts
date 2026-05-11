/** Live Sessions admin — shared row shape (API + UI). */
export type AdminSessionRow = {
    id: string
    title?: string | null
    date: string | null
    time: string | null
    capacity: number | null
    booked: number | null
    status?: string
    starts_soon?: boolean
    is_live?: boolean
}
