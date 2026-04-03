"use client"

import { useLearningAssistContext } from "@/context/LearningAssistContext"

/**
 * Punto de entrada único para componentes.
 * Más adelante aquí se puede inyectar telemetría o un backend de tutor IA.
 */
export function useLearningAssist() {
    return useLearningAssistContext()
}
