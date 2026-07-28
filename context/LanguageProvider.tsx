"use client"

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react"
import { en, type TranslationKeys } from "@/lib/i18n/en"
import { es } from "@/lib/i18n/es"

export type Language = "en" | "es"

const STORAGE_KEY = "smart-option-academy-lang"

const translations: Record<Language, TranslationKeys> = {
    en,
    es,
}

type LanguageContextValue = {
    language: Language
    setLanguage: (lang: Language) => void
    t: TranslationKeys
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>("es")

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === "en" || stored === "es") {
            setLanguageState(stored)
        }
    }, [])

    useEffect(() => {
        document.documentElement.lang = language
    }, [language])

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem(STORAGE_KEY, lang)
    }, [])

    const t = translations[language]

    const value = useMemo(
        () => ({ language, setLanguage, t }),
        [language, setLanguage, t]
    )

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
    const ctx = useContext(LanguageContext)
    if (!ctx) {
        throw new Error("useLanguage must be used within LanguageProvider")
    }
    return ctx
}
