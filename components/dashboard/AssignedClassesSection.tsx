"use client"

import styles from "./AssignedClassesSection.module.css"

type AssignedClassesSectionProps = {
    classes?: string[] | null
}

export default function AssignedClassesSection({ classes }: AssignedClassesSectionProps) {
    const list = classes?.filter((c) => typeof c === "string" && c.trim().length > 0) ?? []

    return (
        <section className={styles.section} aria-labelledby="mis-clases-heading">
            <h2 id="mis-clases-heading" className={styles.title}>
                📚 Mis Clases
            </h2>

            {list.length > 0 ? (
                <div className={styles.grid}>
                    {list.map((title, i) => (
                        <div key={`${title}-${i}`} className={styles.card}>
                            {title}
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.empty}>No tienes clases asignadas aún</p>
            )}
        </section>
    )
}
