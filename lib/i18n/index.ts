import { en, type TranslationKeys } from "./en"
import { es } from "./es"

export type Language = "en" | "es"

export const STORAGE_KEY = "smart-option-academy-lang"

export const translations: Record<Language, TranslationKeys> = {
    en,
    es,
}

export function getTranslations(lang: Language): TranslationKeys {
    return translations[lang]
}

export function readStoredLanguage(): Language {
    if (typeof window === "undefined") return "es"
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "en" || stored === "es" ? stored : "es"
}
