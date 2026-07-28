"use client"

import { useLanguage } from "@/context/LanguageProvider"
import styles from "./DashboardHeader.module.css"

type DashboardHeaderProps = {
    welcomeName: string
    sectionTitle?: string
}

export default function DashboardHeader({ welcomeName, sectionTitle }: DashboardHeaderProps) {
    const { t } = useLanguage()
    const title = sectionTitle ?? t.navDashboard

    return (
        <header className={styles.wrap}>
            <div className={styles.title}>{title}</div>
            <div className={styles.right}>
                <span className={styles.welcome}>
                    {t.welcome} {welcomeName}
                </span>
            </div>
        </header>
    )
}
