"use client"

import styles from "./DashboardHeader.module.css"

type DashboardHeaderProps = {
    welcomeName: string
    sectionTitle?: string
}

export default function DashboardHeader({ welcomeName, sectionTitle = "Dashboard" }: DashboardHeaderProps) {
    return (
        <header className={styles.wrap}>
            <div className={styles.title}>{sectionTitle}</div>
            <div className={styles.right}>
                <span className={styles.welcome}>Welcome, {welcomeName}</span>
            </div>
        </header>
    )
}
