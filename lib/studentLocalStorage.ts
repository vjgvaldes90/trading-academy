export const STUDENT_STORAGE_KEY = "student"

export type StoredStudent = {
    name: string
    email: string
    /** Assigned class titles (empty until configured in backend). */
    classes: string[]
}

/** Safe read for dashboard session (no throw). */
export function readStoredStudent(): StoredStudent | null {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem(STUDENT_STORAGE_KEY)
    if (!raw) return null
    try {
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== "object") return null
        const o = parsed as Record<string, unknown>
        const name = typeof o.name === "string" ? o.name.trim() : ""
        const email = typeof o.email === "string" ? o.email.trim() : ""
        if (!name || !email) return null
        const classes = Array.isArray(o.classes)
            ? o.classes.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            : []
        return { name, email, classes }
    } catch {
        return null
    }
}

export function buildStudentDisplayName(p: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
}): string {
    const a = (p.first_name ?? "").trim()
    const b = (p.last_name ?? "").trim()
    if (a || b) return [a, b].filter(Boolean).join(" ").trim()
    const em = (p.email ?? "").trim()
    if (em.includes("@")) return em.split("@")[0] ?? em
    return em || "Student"
}

export function persistStudent(student: StoredStudent): void {
    if (typeof window === "undefined") return
    localStorage.setItem(
        STUDENT_STORAGE_KEY,
        JSON.stringify({
            name: student.name,
            email: student.email,
            classes: student.classes ?? [],
        })
    )
}

export function clearStoredStudent(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(STUDENT_STORAGE_KEY)
}
