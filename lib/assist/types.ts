/**
 * Contrato extensible para un futuro tutor IA.
 * Los "channels" agrupan intentos sin acoplarse a una pantalla concreta.
 */
export type AssistChannel = string

export type AssistSuggestion = {
    id: string
    title: string
    body: string
    /** Mayor = más urgente (desempate en el selector). */
    priority: number
    /** Metadatos opacos para logging o futuro modelo. */
    meta?: Record<string, unknown>
}

export type LearningSnapshot = {
    failedAttemptsByChannel: Record<AssistChannel, number>
    lastInteractionAt: number
    lastFailureAt: number | null
    /** Timestamp hasta el cual no mostrar sugerencias (snooze). */
    helpSnoozedUntil: number | null
    sessionStartedAt: number
}

export type LearningAssistActions = {
    poke: () => void
    recordFailure: (channel: AssistChannel, increment?: number) => void
    clearFailures: (channel: AssistChannel) => void
    snooze: (ms: number) => void
    /** Enfirma sugerencias visibles (snooze); no lógica duplicada en UI. */
    dismissCurrent: () => void
}
