import type { AssistSuggestion, LearningSnapshot } from "./types"

/**
 * Contrato para un tutor IA externo (streaming, RAG, etc.).
 * Implementación vacía a propósito: el producto ya tiene selector local + contexto.
 */
export type TutorTurnRequest = {
    snapshot: LearningSnapshot
    activeSuggestion: AssistSuggestion | null
    locale: string
}

export type TutorTurnResponse = {
    message: string
    /** Acciones opcionales: p. ej. abrir modal, marcar channel resuelto. */
    actions?: { type: "clear_failures"; channel: string }[]
}

export async function requestTutorTurn(_req: TutorTurnRequest): Promise<TutorTurnResponse> {
    throw new Error("Tutor IA no configurado. Conectar endpoint aquí.")
}
