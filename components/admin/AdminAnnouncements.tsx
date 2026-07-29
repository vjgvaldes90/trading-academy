"use client"

import AnnouncementEditorModal, {
    type AnnouncementEditorValues,
} from "@/components/admin/AnnouncementEditorModal"
import DeleteAnnouncementModal from "@/components/admin/DeleteAnnouncementModal"
import StudentToast, {
    type StudentToastTone,
} from "@/components/dashboard/support/StudentToast"
import { formatSupportDate } from "@/components/dashboard/support/supportLabels"
import { useLanguage } from "@/context/LanguageProvider"
import {
    type Announcement,
    type AnnouncementPriority,
} from "@/lib/announcements"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

function priorityBadgeClass(priority: AnnouncementPriority): string {
    switch (priority) {
        case "critical":
            return "border-red-400/30 bg-red-500/15 text-red-100"
        case "important":
            return "border-amber-400/30 bg-amber-500/15 text-amber-100"
        case "normal":
        default:
            return "border-blue-400/25 bg-blue-500/10 text-blue-200"
    }
}

type ApiListResponse = {
    ok?: unknown
    data?: Announcement[]
    error?: string
}

type ApiMutationResponse = {
    ok?: unknown
    data?: Announcement
    error?: string
}

export default function AdminAnnouncements() {
    const { t, language } = useLanguage()
    const [rows, setRows] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [editorOpen, setEditorOpen] = useState(false)
    const [editorMode, setEditorMode] = useState<"create" | "edit">("create")
    const [editing, setEditing] = useState<Announcement | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [toast, setToast] = useState<{ message: string; tone: StudentToastTone } | null>(null)

    const showToast = useCallback((message: string, tone: StudentToastTone) => {
        setToast({ message, tone })
    }, [])

    const priorityLabel = useCallback(
        (priority: AnnouncementPriority) => {
            if (priority === "critical") return t.adminAnnouncementsPriorityCritical
            if (priority === "important") return t.adminAnnouncementsPriorityImportant
            return t.adminAnnouncementsPriorityNormal
        },
        [t]
    )

    const load = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const res = await fetch("/api/admin/announcements?limit=100&offset=0", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => ({}))) as ApiListResponse
            if (!res.ok || payload.ok !== true || !Array.isArray(payload.data)) {
                setRows([])
                setError(true)
                return
            }
            setRows(payload.data)
        } catch {
            setRows([])
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const openCreate = () => {
        setEditorMode("create")
        setEditing(null)
        setEditorOpen(true)
    }

    const openEdit = (row: Announcement) => {
        setEditorMode("edit")
        setEditing(row)
        setEditorOpen(true)
    }

    const handleSave = async (values: AnnouncementEditorValues) => {
        setSaving(true)
        try {
            if (editorMode === "create") {
                const res = await fetch("/api/admin/announcements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify(values),
                })
                const payload = (await res.json().catch(() => ({}))) as ApiMutationResponse
                if (!res.ok || payload.ok !== true) {
                    showToast(t.adminAnnouncementsToastCreateError, "error")
                    return
                }
                showToast(t.adminAnnouncementsToastPublished, "success")
            } else if (editing) {
                const res = await fetch(`/api/admin/announcements/${encodeURIComponent(editing.id)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify(values),
                })
                const payload = (await res.json().catch(() => ({}))) as ApiMutationResponse
                if (!res.ok || payload.ok !== true) {
                    showToast(t.adminAnnouncementsToastUpdateError, "error")
                    return
                }
                showToast(t.adminAnnouncementsToastUpdated, "success")
            }
            setEditorOpen(false)
            setEditing(null)
            await load()
        } catch {
            showToast(
                editorMode === "create"
                    ? t.adminAnnouncementsToastCreateError
                    : t.adminAnnouncementsToastUpdateError,
                "error"
            )
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch(
                `/api/admin/announcements/${encodeURIComponent(deleteTarget.id)}`,
                {
                    method: "DELETE",
                    credentials: "include",
                    cache: "no-store",
                }
            )
            const payload = (await res.json().catch(() => ({}))) as { ok?: unknown; error?: string }
            if (!res.ok || payload.ok !== true) {
                throw new Error(payload.error || t.adminAnnouncementsToastDeleteError)
            }
            showToast(t.adminAnnouncementsToastDeleted, "success")
            setDeleteTarget(null)
            await load()
        } catch (e: unknown) {
            showToast(
                e instanceof Error ? e.message : t.adminAnnouncementsToastDeleteError,
                "error"
            )
            throw e
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-white/60">{t.adminAnnouncementsSubtitle}</p>
                <button
                    type="button"
                    onClick={openCreate}
                    className="rounded-lg border border-amber-400/40 bg-[#0f172a]/90 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:border-amber-300/60 hover:bg-[#0f172a]"
                >
                    {t.adminAnnouncementsNew}
                </button>
            </div>

            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
                {loading ? (
                    <div className="flex items-center justify-center gap-3 px-4 py-16 text-sm text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-400" aria-hidden />
                        <span>{t.adminAnnouncementsLoading}</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                        <p className="text-sm text-red-400">{t.adminAnnouncementsLoadError}</p>
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                        >
                            {t.adminAnnouncementsRetry}
                        </button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
                        <p className="text-sm text-slate-400">{t.adminAnnouncementsEmpty}</p>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="rounded-lg border border-amber-400/40 bg-[#0f172a]/90 px-4 py-2.5 text-sm font-bold text-amber-300 transition hover:border-amber-300/60 hover:bg-[#0f172a]"
                        >
                            {t.adminAnnouncementsCreateFirst}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-white/10 bg-[#0f172a]/70">
                                    {[
                                        t.adminAnnouncementsColPriority,
                                        t.adminAnnouncementsColTitle,
                                        t.adminAnnouncementsColPublished,
                                        t.adminAnnouncementsColCreated,
                                        t.adminAnnouncementsColActions,
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-white/[0.06] last:border-b-0"
                                    >
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${priorityBadgeClass(row.priority)}`}
                                            >
                                                {priorityLabel(row.priority)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-100">
                                            {row.title}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {row.published
                                                ? t.adminAnnouncementsPublishedYes
                                                : t.adminAnnouncementsPublishedNo}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {formatSupportDate(row.created_at, language)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(row)}
                                                    className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                                                >
                                                    {t.adminAnnouncementsEdit}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(row)}
                                                    className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                                                >
                                                    {t.adminAnnouncementsDelete}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <AnnouncementEditorModal
                open={editorOpen}
                mode={editorMode}
                initial={editing}
                submitting={saving}
                onClose={() => {
                    if (saving) return
                    setEditorOpen(false)
                    setEditing(null)
                }}
                onSubmit={handleSave}
            />

            <DeleteAnnouncementModal
                open={deleteTarget !== null}
                title={deleteTarget?.title}
                submitting={deleting}
                onClose={() => {
                    if (deleting) return
                    setDeleteTarget(null)
                }}
                onConfirm={handleDelete}
            />

            {toast ? (
                <StudentToast
                    message={toast.message}
                    tone={toast.tone}
                    onDismiss={() => setToast(null)}
                />
            ) : null}
        </div>
    )
}
