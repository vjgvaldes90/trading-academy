"use client"

import type { CSSProperties, FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/context/LanguageProvider"
import { createClient } from "@supabase/supabase-js"
import {
    RECORDED_CLASS_MAX_BYTES,
    formatBytes,
    isAllowedRecordedMime,
} from "@/lib/recordedLessons"
import { requireBrowserSupabaseEnv } from "@/lib/supabase/publicEnv"

type LessonSourceType = "youtube" | "upload"
type LessonClassType = "trading" | "theory"

type LessonRow = {
    id: string
    title: string
    description: string | null
    video_url: string | null
    source_type?: string | null
    class_date?: string | null
    class_type?: string | null
    created_at: string
}

type CreateMode = "youtube" | "upload"

function formatCreatedAt(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

function formatClassDate(iso: string | null | undefined): string {
    if (!iso || !String(iso).trim()) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { dateStyle: "medium" })
}

async function uploadFileWithProgress(
    signedUrl: string,
    file: File,
    onProgress: (pct: number) => void
): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", signedUrl)
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.upload.onprogress = (ev) => {
            if (!ev.lengthComputable || ev.total <= 0) return
            onProgress(Math.min(100, Math.round((ev.loaded / ev.total) * 100)))
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(100)
                resolve()
            } else {
                reject(new Error(`Upload failed (${xhr.status})`))
            }
        }
        xhr.onerror = () => reject(new Error("Upload network error"))
        xhr.send(file)
    })
}

export default function AdminClasses() {
    const { t } = useLanguage()
    const [mode, setMode] = useState<CreateMode>("youtube")
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [videoUrl, setVideoUrl] = useState("")
    const [classDate, setClassDate] = useState("")
    const [classType, setClassType] = useState<LessonClassType | "">("")
    const [file, setFile] = useState<File | null>(null)

    const [busy, setBusy] = useState(false)
    const [uploadPct, setUploadPct] = useState<number | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [lessons, setLessons] = useState<LessonRow[]>([])
    const [listLoading, setListLoading] = useState(true)
    const [listError, setListError] = useState<string | null>(null)

    const loadLessons = useCallback(async () => {
        setListLoading(true)
        setListError(null)
        try {
            const res = await fetch("/api/lessons", { cache: "no-store", credentials: "include" })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                const msg =
                    typeof (payload as { error?: string })?.error === "string"
                        ? (payload as { error: string }).error
                        : t.adminFailedToLoadClasses
                throw new Error(msg)
            }
            setLessons(Array.isArray(payload) ? (payload as LessonRow[]) : [])
        } catch (e) {
            setListError(e instanceof Error ? e.message : t.adminFailedToLoadClasses)
            setLessons([])
        } finally {
            setListLoading(false)
        }
    }, [t])

    useEffect(() => {
        void loadLessons()
    }, [loadLessons])

    const fileMeta = useMemo(() => {
        if (!file) return null
        return {
            name: file.name,
            sizeLabel: formatBytes(file.size),
            type: file.type || "unknown",
        }
    }, [file])

    const resetForm = () => {
        setTitle("")
        setDescription("")
        setVideoUrl("")
        setClassDate("")
        setClassType("")
        setFile(null)
        setUploadPct(null)
    }

    const handleFileChange = (next: File | null) => {
        setFormError(null)
        setSuccess(null)
        if (!next) {
            setFile(null)
            return
        }
        const mime = (next.type || "").toLowerCase()
        if (!isAllowedRecordedMime(mime)) {
            setFile(null)
            setFormError(t.recordedClassUnsupportedType)
            return
        }
        if (next.size > RECORDED_CLASS_MAX_BYTES) {
            setFile(null)
            setFormError(
                t.recordedClassFileTooLarge.replace(
                    "{max}",
                    formatBytes(RECORDED_CLASS_MAX_BYTES)
                )
            )
            return
        }
        setFile(next)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError(null)
        setSuccess(null)
        setBusy(true)
        setUploadPct(null)

        try {
            if (!title.trim()) {
                throw new Error(t.titleLabel)
            }

            if (mode === "youtube") {
                if (!videoUrl.trim()) {
                    throw new Error(t.adminVideoUrlLabel)
                }
                const res = await fetch("/api/admin/lessons", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sourceType: "youtube" satisfies LessonSourceType,
                        title: title.trim(),
                        description: description.trim(),
                        videoUrl: videoUrl.trim(),
                        classDate: classDate.trim() || undefined,
                        classType: classType || undefined,
                    }),
                })
                const payload = (await res.json().catch(() => ({}))) as { error?: string }
                if (!res.ok) {
                    throw new Error(
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminCouldNotAddClass
                    )
                }
            } else {
                if (!file) {
                    throw new Error(t.recordedClassSelectFile)
                }
                const mime = (file.type || "").toLowerCase()
                if (!isAllowedRecordedMime(mime)) {
                    throw new Error(t.recordedClassUnsupportedType)
                }
                if (file.size > RECORDED_CLASS_MAX_BYTES) {
                    throw new Error(
                        t.recordedClassFileTooLarge.replace(
                            "{max}",
                            formatBytes(RECORDED_CLASS_MAX_BYTES)
                        )
                    )
                }

                const prepareRes = await fetch("/api/admin/lessons/prepare-upload", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contentType: mime,
                        fileSize: file.size,
                    }),
                })
                const preparePayload = (await prepareRes.json().catch(() => ({}))) as {
                    ok?: unknown
                    path?: unknown
                    token?: unknown
                    signedUrl?: unknown
                    error?: unknown
                }
                if (
                    !prepareRes.ok ||
                    preparePayload.ok !== true ||
                    typeof preparePayload.path !== "string" ||
                    typeof preparePayload.token !== "string"
                ) {
                    throw new Error(
                        typeof preparePayload.error === "string" && preparePayload.error.trim()
                            ? preparePayload.error
                            : t.recordedClassPrepareFailed
                    )
                }

                setUploadPct(0)
                const path = preparePayload.path
                const token = preparePayload.token
                const signedUrl =
                    typeof preparePayload.signedUrl === "string"
                        ? preparePayload.signedUrl
                        : null

                try {
                    if (signedUrl) {
                        await uploadFileWithProgress(signedUrl, file, setUploadPct)
                    } else {
                        const { url, anonKey } = requireBrowserSupabaseEnv()
                        const client = createClient(url, anonKey)
                        const { error: upErr } = await client.storage
                            .from("recorded-classes")
                            .uploadToSignedUrl(path, token, file, {
                                contentType: mime,
                                upsert: false,
                            })
                        if (upErr) throw new Error(upErr.message)
                        setUploadPct(100)
                    }
                } catch (up) {
                    throw new Error(
                        up instanceof Error && up.message.trim()
                            ? up.message
                            : t.recordedClassUploadFailed
                    )
                }

                const saveRes = await fetch("/api/admin/lessons", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sourceType: "upload" satisfies LessonSourceType,
                        title: title.trim(),
                        description: description.trim(),
                        storagePath: path,
                        classDate: classDate.trim() || undefined,
                        classType: classType || undefined,
                    }),
                })
                const savePayload = (await saveRes.json().catch(() => ({}))) as { error?: string }
                if (!saveRes.ok) {
                    throw new Error(
                        typeof savePayload.error === "string" && savePayload.error.trim()
                            ? savePayload.error
                            : t.adminCouldNotAddClass
                    )
                }
            }

            setSuccess(t.adminClassAddedSuccess)
            resetForm()
            await loadLessons()
        } catch (e) {
            setFormError(e instanceof Error ? e.message : t.adminCouldNotAddClass)
        } finally {
            setBusy(false)
        }
    }

    const inputStyle: CSSProperties = {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(15,23,42,0.85)",
        color: "#e5e7eb",
        fontSize: "0.9rem",
        outline: "none",
    }

    const labelStyle: CSSProperties = {
        display: "block",
        fontSize: "0.8rem",
        fontWeight: 700,
        color: "#cbd5e1",
        marginBottom: 6,
    }

    const modeBtn = (active: boolean): CSSProperties => ({
        padding: "8px 12px",
        borderRadius: 10,
        border: active ? "1px solid rgba(59,130,246,0.55)" : "1px solid rgba(148,163,184,0.25)",
        background: active ? "rgba(37,99,235,0.2)" : "rgba(15,23,42,0.55)",
        color: active ? "#bfdbfe" : "#cbd5e1",
        fontWeight: 800,
        fontSize: "0.8rem",
        cursor: busy ? "not-allowed" : "pointer",
    })

    return (
        <div className="space-y-6 text-[#e5e7eb]">
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <p style={{ margin: "0 0 18px", color: "#9ca3af", fontSize: "0.95rem" }}>
                    {t.adminClassesSubtitle}
                </p>

                <section
                    style={{
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                        borderRadius: 16,
                        boxShadow: "0 20px 30px -20px rgba(37,99,235,0.35)",
                        overflow: "hidden",
                        marginBottom: 20,
                    }}
                >
                    <div
                        style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(59,130,246,0.2)",
                            background: "rgba(2,6,23,0.45)",
                        }}
                    >
                        <span style={{ fontWeight: 700, color: "#93c5fd" }}>
                            {t.adminAddRecordedClass}
                        </span>
                    </div>
                    <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: "16px" }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                            <button
                                type="button"
                                disabled={busy}
                                style={modeBtn(mode === "youtube")}
                                onClick={() => {
                                    setMode("youtube")
                                    setFile(null)
                                    setUploadPct(null)
                                    setFormError(null)
                                }}
                            >
                                {t.recordedClassModeYoutube}
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                style={modeBtn(mode === "upload")}
                                onClick={() => {
                                    setMode("upload")
                                    setVideoUrl("")
                                    setUploadPct(null)
                                    setFormError(null)
                                }}
                            >
                                {t.recordedClassModeUpload}
                            </button>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>{t.titleLabel}</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                disabled={busy}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>{t.descriptionLabel}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                disabled={busy}
                                style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                            />
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12,
                                marginBottom: 14,
                            }}
                        >
                            <div>
                                <label style={labelStyle}>{t.recordedClassDateLabel}</label>
                                <input
                                    type="date"
                                    value={classDate}
                                    onChange={(e) => setClassDate(e.target.value)}
                                    disabled={busy}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>{t.recordedClassTypeLabel}</label>
                                <select
                                    value={classType}
                                    onChange={(e) =>
                                        setClassType(
                                            e.target.value === "trading" || e.target.value === "theory"
                                                ? e.target.value
                                                : ""
                                        )
                                    }
                                    disabled={busy}
                                    style={inputStyle}
                                >
                                    <option value="">{t.recordedClassTypeOptional}</option>
                                    <option value="trading">{t.recordedClassTypeTrading}</option>
                                    <option value="theory">{t.recordedClassTypeTheory}</option>
                                </select>
                            </div>
                        </div>

                        {mode === "youtube" ? (
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>{t.adminVideoUrlLabel}</label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    required
                                    disabled={busy}
                                    placeholder="https://www.youtube.com/embed/..."
                                    style={inputStyle}
                                />
                            </div>
                        ) : (
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>{t.recordedClassSelectFile}</label>
                                <input
                                    type="file"
                                    accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                    disabled={busy}
                                    onChange={(e) =>
                                        handleFileChange(e.target.files?.[0] ?? null)
                                    }
                                    style={{ ...inputStyle, padding: 8 }}
                                />
                                <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                                    {t.recordedClassUploadHint.replace(
                                        "{max}",
                                        formatBytes(RECORDED_CLASS_MAX_BYTES)
                                    )}
                                </p>
                                {fileMeta ? (
                                    <p
                                        style={{
                                            margin: "8px 0 0",
                                            fontSize: "0.8rem",
                                            color: "#cbd5e1",
                                        }}
                                    >
                                        {fileMeta.name} · {fileMeta.sizeLabel} · {fileMeta.type}
                                    </p>
                                ) : null}
                                {uploadPct !== null ? (
                                    <div style={{ marginTop: 12 }}>
                                        <div
                                            style={{
                                                height: 8,
                                                borderRadius: 999,
                                                background: "rgba(148,163,184,0.2)",
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: "100%",
                                                    width: `${uploadPct}%`,
                                                    background: "rgba(59,130,246,0.85)",
                                                    transition: "width 0.15s ease",
                                                }}
                                            />
                                        </div>
                                        <p
                                            style={{
                                                margin: "6px 0 0",
                                                fontSize: "0.75rem",
                                                color: "#93c5fd",
                                            }}
                                        >
                                            {t.recordedClassUploadProgress.replace(
                                                "{pct}",
                                                String(uploadPct)
                                            )}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {formError ? (
                            <p style={{ margin: "0 0 12px", color: "#ef4444", fontSize: "0.9rem" }}>
                                {formError}
                            </p>
                        ) : null}
                        {success ? (
                            <p style={{ margin: "0 0 12px", color: "#4ade80", fontSize: "0.9rem" }}>
                                {success}
                            </p>
                        ) : null}
                        <button
                            type="submit"
                            disabled={busy || (mode === "upload" && !file)}
                            style={{
                                padding: "8px 14px",
                                borderRadius: 10,
                                border: "1px solid rgba(250,204,21,0.45)",
                                background: busy ? "rgba(51,65,85,0.5)" : "rgba(15,23,42,0.6)",
                                color: "#facc15",
                                fontWeight: 800,
                                fontSize: "0.8125rem",
                                cursor: busy ? "not-allowed" : "pointer",
                                opacity: busy ? 0.7 : 1,
                            }}
                        >
                            {busy
                                ? mode === "upload" && uploadPct !== null
                                    ? t.recordedClassUploading
                                    : t.adding
                                : t.adminAddClass}
                        </button>
                    </form>
                </section>

                <section
                    style={{
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "linear-gradient(145deg, #111827 0%, #0B0F1A 100%)",
                        borderRadius: 16,
                        boxShadow: "0 20px 30px -20px rgba(37,99,235,0.35)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(59,130,246,0.2)",
                            background: "rgba(2,6,23,0.45)",
                        }}
                    >
                        <span style={{ fontWeight: 700, color: "#93c5fd" }}>
                            {t.adminPublishedClasses}
                        </span>
                    </div>
                    <div style={{ padding: "16px" }}>
                        {listLoading ? (
                            <p style={{ margin: 0, color: "#9ca3af" }}>{t.loading}</p>
                        ) : listError ? (
                            <p style={{ margin: 0, color: "#ef4444" }}>{listError}</p>
                        ) : lessons.length === 0 ? (
                            <p style={{ margin: 0, color: "#9ca3af" }}>
                                {t.noRecordedClassesAvailable}
                            </p>
                        ) : (
                            <ul
                                style={{
                                    listStyle: "none",
                                    margin: 0,
                                    padding: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                }}
                            >
                                {lessons.map((lesson) => {
                                    const source =
                                        lesson.source_type === "upload" ? "upload" : "youtube"
                                    return (
                                        <li
                                            key={lesson.id}
                                            style={{
                                                border: "1px solid rgba(59,130,246,0.15)",
                                                borderRadius: 12,
                                                padding: "14px 16px",
                                                background: "rgba(15,23,42,0.55)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 800,
                                                    color: "#f8fafc",
                                                    marginBottom: 6,
                                                }}
                                            >
                                                {lesson.title}
                                            </div>
                                            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                                                {source === "upload"
                                                    ? t.recordedClassSourceUpload
                                                    : t.recordedClassSourceYoutube}
                                                {" · "}
                                                {t.recordedClassDateLabel}:{" "}
                                                {formatClassDate(lesson.class_date)}
                                                {lesson.class_type
                                                    ? ` · ${
                                                          lesson.class_type === "theory"
                                                              ? t.recordedClassTypeTheory
                                                              : t.recordedClassTypeTrading
                                                      }`
                                                    : ""}
                                            </div>
                                            <div
                                                style={{
                                                    marginTop: 4,
                                                    fontSize: "0.75rem",
                                                    color: "#64748b",
                                                }}
                                            >
                                                {formatCreatedAt(lesson.created_at)}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
