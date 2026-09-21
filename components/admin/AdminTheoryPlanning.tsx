"use client"

import CancelSessionConfirmModal from "@/app/admin/CancelSessionConfirmModal"
import StudentToast, {
    type StudentToastTone,
} from "@/components/dashboard/support/StudentToast"
import DateTimeField from "@/components/shared/DateTimeField"
import { useLanguage } from "@/context/LanguageProvider"
import type { TranslationKeys } from "@/lib/i18n/en"
import {
    THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED,
    THEORY_PLANNING_STATUSES,
    isTheoryPlanningActiveStatus,
    type TheoryPlanningStatus,
} from "@/lib/theoryPlanning"
import { useCallback, useEffect, useMemo, useState } from "react"

type TheoryPlanningMember = {
    id: string
    group_id: string
    student_id: string
    added_by_admin_email: string | null
    added_at: string
    email: string | null
    first_name: string | null
    last_name: string | null
}

type TheoryPlanningGroup = {
    id: string
    title: string | null
    status: string
    theory_slot: number
    tentative_date: string | null
    tentative_time: string | null
    confirmed_date: string | null
    confirmed_time: string | null
    session_id: string | null
    admin_notes: string | null
    created_by_admin_email: string | null
    updated_by_admin_email: string | null
    created_at: string
    updated_at: string
    member_count: number
    members?: TheoryPlanningMember[]
}

type EligibleStudent = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    used: number
    theory_slot: 1 | 2
    is_active: boolean | null
}

type TheorySessionOption = {
    id: string
    title: string | null
    date: string | null
    time: string | null
    session_type?: string | null
    unavailable?: boolean
}

type StatusFilter = "" | TheoryPlanningStatus
type SlotFilter = "" | "1" | "2"

type ApiErrorPayload = {
    error?: string
    code?: string
}

function toTimeInputValue(raw: string | null | undefined): string {
    const value = String(raw ?? "").trim()
    const match = /^(\d{2}):(\d{2})/.exec(value)
    return match ? `${match[1]}:${match[2]}` : ""
}

function studentDisplayName(row: {
    first_name: string | null
    last_name: string | null
    email: string | null
}): string {
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim()
    if (name) return name
    return row.email?.trim() || "—"
}

function formatDateTimePair(
    date: string | null | undefined,
    time: string | null | undefined,
    emptyLabel: string
): string {
    const d = String(date ?? "").trim()
    const t = toTimeInputValue(time)
    if (!d && !t) return emptyLabel
    if (d && t) return `${d} · ${t}`
    return d || t
}

function statusBadgeClass(status: string): string {
    switch (status) {
        case "draft":
            return "border-slate-400/30 bg-slate-500/15 text-slate-200"
        case "scheduled":
            return "border-sky-400/35 bg-sky-500/15 text-sky-100"
        case "completed":
            return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
        case "cancelled":
            return "border-red-400/35 bg-red-500/15 text-red-100"
        default:
            return "border-white/15 bg-white/5 text-slate-300"
    }
}

function mapTheoryPlanningError(
    code: string | undefined,
    fallback: string,
    t: TranslationKeys
): string {
    switch (code) {
        case "already_in_active_group_for_slot":
            return t.adminTheoryPlanningErrorAlreadyInGroup
        case "not_full_program":
            return t.adminTheoryPlanningErrorNotFullProgram
        case "period_not_configured":
            return t.adminTheoryPlanningErrorPeriodNotConfigured
        case "slot_mismatch":
            return t.adminTheoryPlanningErrorSlotMismatch
        case "quota_exhausted":
            return t.adminTheoryPlanningErrorQuotaExhausted
        case "group_not_active":
            return t.adminTheoryPlanningErrorGroupNotActive
        case "insufficient_members":
            return t.adminTheoryPlanningErrorInsufficientMembers
        case "scheduled_min_members":
            return t.adminTheoryPlanningErrorScheduledMinMembers.replace(
                "{count}",
                String(THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED)
            )
        case "invalid_status_transition":
            return t.adminTheoryPlanningErrorInvalidTransition
        case "session_not_found":
            return t.adminTheoryPlanningErrorSessionNotFound
        case "session_not_theory":
            return t.adminTheoryPlanningErrorSessionNotTheory
        case "session_already_linked":
            return t.adminTheoryPlanningErrorSessionLinked
        case "conflict":
            return t.adminTheoryPlanningErrorConflict
        case "validation_error":
            return t.adminTheoryPlanningErrorValidation
        case "lookup_failed":
            return t.adminTheoryPlanningErrorLookupFailed
        case "invalid_args":
            return t.adminTheoryPlanningErrorInvalidArgs
        case "not_found":
            return t.adminTheoryPlanningErrorNotFound
        default:
            return fallback
    }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
    return (await res.json().catch(() => ({}))) as Record<string, unknown>
}

export default function AdminTheoryPlanning() {
    const { t } = useLanguage()
    const [groups, setGroups] = useState<TheoryPlanningGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("")
    const [slotFilter, setSlotFilter] = useState<SlotFilter>("")
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [detail, setDetail] = useState<TheoryPlanningGroup | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; tone: StudentToastTone } | null>(null)

    const [createOpen, setCreateOpen] = useState(false)
    const [createSlot, setCreateSlot] = useState<1 | 2>(1)
    const [createTitle, setCreateTitle] = useState("")
    const [createNotes, setCreateNotes] = useState("")
    const [createDate, setCreateDate] = useState("")
    const [createTime, setCreateTime] = useState("")
    const [createSubmitting, setCreateSubmitting] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const [editTitle, setEditTitle] = useState("")
    const [editNotes, setEditNotes] = useState("")
    const [editStatus, setEditStatus] = useState<TheoryPlanningStatus>("draft")
    const [editTentativeDate, setEditTentativeDate] = useState("")
    const [editTentativeTime, setEditTentativeTime] = useState("")
    const [editConfirmedDate, setEditConfirmedDate] = useState("")
    const [editConfirmedTime, setEditConfirmedTime] = useState("")
    const [editSubmitting, setEditSubmitting] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)

    const [eligible, setEligible] = useState<EligibleStudent[]>([])
    const [eligibleLoading, setEligibleLoading] = useState(false)
    const [eligibleError, setEligibleError] = useState<string | null>(null)
    const [eligibleSearch, setEligibleSearch] = useState("")
    const [addingStudentId, setAddingStudentId] = useState<string | null>(null)

    const [removeTarget, setRemoveTarget] = useState<TheoryPlanningMember | null>(null)

    const [theorySessions, setTheorySessions] = useState<TheorySessionOption[]>([])
    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [sessionsError, setSessionsError] = useState<string | null>(null)
    const [selectedSessionId, setSelectedSessionId] = useState("")
    const [sessionBusy, setSessionBusy] = useState(false)

    const statusLabel = useCallback(
        (status: string) => {
            switch (status) {
                case "draft":
                    return t.adminTheoryPlanningStatusDraft
                case "scheduled":
                    return t.adminTheoryPlanningStatusScheduled
                case "completed":
                    return t.adminTheoryPlanningStatusCompleted
                case "cancelled":
                    return t.adminTheoryPlanningStatusCancelled
                default:
                    return status
            }
        },
        [t]
    )

    const slotLabel = useCallback(
        (slot: number) =>
            slot === 2 ? t.adminTheoryPlanningSlot2 : t.adminTheoryPlanningSlot1,
        [t]
    )

    const isReadMostly = detail
        ? detail.status === "completed" || detail.status === "cancelled"
        : false
    const memberCount = detail?.member_count ?? detail?.members?.length ?? 0
    const canSchedule =
        memberCount >= THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED &&
        detail !== null &&
        detail.status !== "completed" &&
        detail.status !== "cancelled"

    const wouldBreakScheduledMinimum =
        detail?.status === "scheduled" &&
        memberCount - 1 < THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED

    const loadGroups = useCallback(
        async (overrides?: { status?: StatusFilter; slot?: SlotFilter }) => {
            setLoading(true)
            setError(null)
            const effectiveStatus = overrides?.status ?? statusFilter
            const effectiveSlot = overrides?.slot ?? slotFilter
            try {
                const params = new URLSearchParams()
                if (effectiveStatus) params.set("status", effectiveStatus)
                if (effectiveSlot) params.set("theory_slot", effectiveSlot)
                const qs = params.toString()
                const res = await fetch(
                    `/api/admin/theory-planning/groups${qs ? `?${qs}` : ""}`,
                    { cache: "no-store", credentials: "include" }
                )
                const payload = await readJson(res)
                if (!res.ok) {
                    setGroups([])
                    setError(
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminTheoryPlanningLoadError
                    )
                    return
                }
                const list = Array.isArray(payload.groups)
                    ? (payload.groups as TheoryPlanningGroup[])
                    : []
                setGroups(list)
            } catch {
                setGroups([])
                setError(t.adminTheoryPlanningLoadError)
            } finally {
                setLoading(false)
            }
        },
        [slotFilter, statusFilter, t]
    )

    const loadDetail = useCallback(
        async (groupId: string) => {
            setDetailLoading(true)
            setDetailError(null)
            try {
                const res = await fetch(`/api/admin/theory-planning/groups/${groupId}`, {
                    cache: "no-store",
                    credentials: "include",
                })
                const payload = await readJson(res)
                if (!res.ok) {
                    setDetail(null)
                    setDetailError(
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminTheoryPlanningLoadError
                    )
                    return
                }
                const group = payload.group as TheoryPlanningGroup | undefined
                if (!group || typeof group.id !== "string") {
                    setDetail(null)
                    setDetailError(t.adminTheoryPlanningLoadError)
                    return
                }
                setDetail(group)
                setEditTitle(group.title ?? "")
                setEditNotes(group.admin_notes ?? "")
                setEditStatus(
                    (THEORY_PLANNING_STATUSES as readonly string[]).includes(group.status)
                        ? (group.status as TheoryPlanningStatus)
                        : "draft"
                )
                setEditTentativeDate(group.tentative_date ?? "")
                setEditTentativeTime(toTimeInputValue(group.tentative_time))
                setEditConfirmedDate(group.confirmed_date ?? "")
                setEditConfirmedTime(toTimeInputValue(group.confirmed_time))
                setSelectedSessionId(group.session_id ?? "")
                setEditError(null)
            } catch {
                setDetail(null)
                setDetailError(t.adminTheoryPlanningLoadError)
            } finally {
                setDetailLoading(false)
            }
        },
        [t]
    )

    const loadEligible = useCallback(
        async (slot: 1 | 2) => {
            setEligibleLoading(true)
            setEligibleError(null)
            try {
                const res = await fetch(
                    `/api/admin/theory-planning/eligible-students?theory_slot=${slot}`,
                    { cache: "no-store", credentials: "include" }
                )
                const payload = await readJson(res)
                if (!res.ok) {
                    setEligible([])
                    setEligibleError(
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminTheoryPlanningEligibleLoadError
                    )
                    return
                }
                const list = Array.isArray(payload.students)
                    ? (payload.students as EligibleStudent[])
                    : []
                setEligible(list)
            } catch {
                setEligible([])
                setEligibleError(t.adminTheoryPlanningEligibleLoadError)
            } finally {
                setEligibleLoading(false)
            }
        },
        [t]
    )

    const loadTheorySessions = useCallback(async () => {
        setSessionsLoading(true)
        setSessionsError(null)
        try {
            const res = await fetch("/api/admin/sessions", {
                cache: "no-store",
                credentials: "include",
            })
            const payload = (await res.json().catch(() => null)) as unknown
            if (!res.ok) {
                setTheorySessions([])
                const errObj =
                    payload && typeof payload === "object" && !Array.isArray(payload)
                        ? (payload as ApiErrorPayload)
                        : null
                setSessionsError(
                    typeof errObj?.error === "string" && errObj.error.trim()
                        ? errObj.error
                        : t.adminTheoryPlanningSessionLoadError
                )
                return
            }
            const list = Array.isArray(payload) ? (payload as TheorySessionOption[]) : []
            setTheorySessions(
                list.filter((row) => (row.session_type ?? "trading") === "theory" && row.id)
            )
        } catch {
            setTheorySessions([])
            setSessionsError(t.adminTheoryPlanningSessionLoadError)
        } finally {
            setSessionsLoading(false)
        }
    }, [t])

    useEffect(() => {
        void loadGroups()
    }, [loadGroups])

    useEffect(() => {
        if (!selectedId) {
            setDetail(null)
            setDetailError(null)
            setEligible([])
            return
        }
        void loadDetail(selectedId)
    }, [loadDetail, selectedId])

    useEffect(() => {
        if (!detail || !isTheoryPlanningActiveStatus(detail.status)) {
            setEligible([])
            return
        }
        const slot = detail.theory_slot === 2 ? 2 : 1
        void loadEligible(slot)
    }, [detail, loadEligible])

    useEffect(() => {
        if (!detail || isReadMostly) return
        void loadTheorySessions()
    }, [detail, isReadMostly, loadTheorySessions])

    const filteredEligible = useMemo(() => {
        const q = eligibleSearch.trim().toLowerCase()
        if (!q) return eligible
        return eligible.filter((s) => {
            const hay = `${s.email} ${s.first_name ?? ""} ${s.last_name ?? ""}`.toLowerCase()
            return hay.includes(q)
        })
    }, [eligible, eligibleSearch])

    const sessionSelectOptions = useMemo(() => {
        const linkedId = detail?.session_id?.trim() || ""
        if (!linkedId) return theorySessions
        if (theorySessions.some((row) => row.id === linkedId)) return theorySessions
        const placeholder: TheorySessionOption = {
            id: linkedId,
            title: null,
            date: null,
            time: null,
            unavailable: true,
        }
        return [placeholder, ...theorySessions]
    }, [detail?.session_id, theorySessions])

    const linkedSessionUnavailable = useMemo(() => {
        const linkedId = detail?.session_id?.trim() || ""
        if (!linkedId) return false
        return !theorySessions.some((row) => row.id === linkedId)
    }, [detail?.session_id, theorySessions])

    const openCreate = () => {
        setCreateError(null)
        setCreateSlot(1)
        setCreateTitle("")
        setCreateNotes("")
        setCreateDate("")
        setCreateTime("")
        setCreateOpen(true)
    }

    const closeCreate = () => {
        if (createSubmitting) return
        setCreateOpen(false)
        setCreateError(null)
    }

    const submitCreate = async () => {
        if (createSubmitting) return
        setCreateError(null)
        const hasDate = createDate.trim() !== ""
        const hasTime = createTime.trim() !== ""
        if (hasDate !== hasTime) {
            setCreateError(t.adminTheoryPlanningDateTimePairRequired)
            return
        }
        setCreateSubmitting(true)
        try {
            const body: Record<string, unknown> = {
                theory_slot: createSlot,
                title: createTitle.trim() || null,
                admin_notes: createNotes.trim() || null,
            }
            if (hasDate && hasTime) {
                body.tentative_date = createDate.trim()
                body.tentative_time = createTime.trim()
            }
            const res = await fetch("/api/admin/theory-planning/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify(body),
            })
            const payload = await readJson(res)
            if (!res.ok) {
                throw new Error(
                    mapTheoryPlanningError(
                        typeof payload.code === "string" ? payload.code : undefined,
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminTheoryPlanningCreateError,
                        t
                    )
                )
            }
            const group = payload.group as TheoryPlanningGroup | undefined
            const nextStatus: StatusFilter = "draft"
            const nextSlot: SlotFilter = createSlot === 2 ? "2" : "1"
            setStatusFilter(nextStatus)
            setSlotFilter(nextSlot)
            setCreateOpen(false)
            setToast({ message: t.adminTheoryPlanningCreateSuccess, tone: "success" })
            await loadGroups({ status: nextStatus, slot: nextSlot })
            if (group?.id) setSelectedId(group.id)
        } catch (e) {
            setCreateError(
                e instanceof Error && e.message.trim()
                    ? e.message
                    : t.adminTheoryPlanningCreateError
            )
        } finally {
            setCreateSubmitting(false)
        }
    }

    const submitEdit = async () => {
        if (!detail || editSubmitting || isReadMostly) return
        setEditError(null)

        if (editStatus === "scheduled" && !canSchedule) {
            setEditError(
                t.adminTheoryPlanningMinMembersBlocked
                    .replace("{count}", String(THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED))
                    .replace("{current}", String(memberCount))
            )
            return
        }

        const tHasDate = editTentativeDate.trim() !== ""
        const tHasTime = editTentativeTime.trim() !== ""
        if (tHasDate !== tHasTime) {
            setEditError(t.adminTheoryPlanningDateTimePairRequired)
            return
        }
        const cHasDate = editConfirmedDate.trim() !== ""
        const cHasTime = editConfirmedTime.trim() !== ""
        if (cHasDate !== cHasTime) {
            setEditError(t.adminTheoryPlanningConfirmedDateTimePairRequired)
            return
        }

        setEditSubmitting(true)
        try {
            const body: Record<string, unknown> = {
                title: editTitle.trim() || null,
                admin_notes: editNotes.trim() || null,
                status: editStatus,
                tentative_date: tHasDate ? editTentativeDate.trim() : null,
                tentative_time: tHasTime ? editTentativeTime.trim() : null,
                confirmed_date: cHasDate ? editConfirmedDate.trim() : null,
                confirmed_time: cHasTime ? editConfirmedTime.trim() : null,
            }
            const res = await fetch(`/api/admin/theory-planning/groups/${detail.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify(body),
            })
            const payload = await readJson(res)
            if (!res.ok) {
                throw new Error(
                    mapTheoryPlanningError(
                        typeof payload.code === "string" ? payload.code : undefined,
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminTheoryPlanningSaveError,
                        t
                    )
                )
            }
            const group = payload.group as TheoryPlanningGroup | undefined
            if (group?.id) {
                setDetail(group)
                setEditTitle(group.title ?? "")
                setEditNotes(group.admin_notes ?? "")
                setEditStatus(
                    (THEORY_PLANNING_STATUSES as readonly string[]).includes(group.status)
                        ? (group.status as TheoryPlanningStatus)
                        : editStatus
                )
                setEditTentativeDate(group.tentative_date ?? "")
                setEditTentativeTime(toTimeInputValue(group.tentative_time))
                setEditConfirmedDate(group.confirmed_date ?? "")
                setEditConfirmedTime(toTimeInputValue(group.confirmed_time))
                setSelectedSessionId(group.session_id ?? "")
            }
            setToast({ message: t.adminTheoryPlanningSaveSuccess, tone: "success" })
            await loadGroups()
        } catch (e) {
            setEditError(
                e instanceof Error && e.message.trim()
                    ? e.message
                    : t.adminTheoryPlanningSaveError
            )
        } finally {
            setEditSubmitting(false)
        }
    }

    const addMember = async (studentId: string) => {
        if (!detail || addingStudentId || isReadMostly) return
        setAddingStudentId(studentId)
        try {
            const res = await fetch(`/api/admin/theory-planning/groups/${detail.id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({ student_id: studentId }),
            })
            const payload = await readJson(res)
            if (!res.ok) {
                throw new Error(
                    mapTheoryPlanningError(
                        typeof payload.code === "string" ? payload.code : undefined,
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminTheoryPlanningAddMemberError,
                        t
                    )
                )
            }
            const membershipStatus =
                typeof payload.membership_status === "string"
                    ? payload.membership_status
                    : ""
            setToast({
                message:
                    membershipStatus === "already"
                        ? t.adminTheoryPlanningAddMemberAlready
                        : t.adminTheoryPlanningAddMemberSuccess,
                tone: "success",
            })
            await loadDetail(detail.id)
            await loadGroups()
            const slot = detail.theory_slot === 2 ? 2 : 1
            await loadEligible(slot)
        } catch (e) {
            setToast({
                message:
                    e instanceof Error && e.message.trim()
                        ? e.message
                        : t.adminTheoryPlanningAddMemberError,
                tone: "error",
            })
        } finally {
            setAddingStudentId(null)
        }
    }

    const linkSession = async (sessionId: string | null) => {
        if (!detail || sessionBusy || isReadMostly) return
        setSessionBusy(true)
        try {
            const res = await fetch(`/api/admin/theory-planning/groups/${detail.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({ session_id: sessionId }),
            })
            const payload = await readJson(res)
            if (!res.ok) {
                throw new Error(
                    mapTheoryPlanningError(
                        typeof payload.code === "string" ? payload.code : undefined,
                        typeof payload.error === "string" && payload.error.trim()
                            ? payload.error
                            : t.adminTheoryPlanningSaveError,
                        t
                    )
                )
            }
            const group = payload.group as TheoryPlanningGroup | undefined
            if (group?.id) {
                setDetail(group)
                setSelectedSessionId(group.session_id ?? "")
            }
            setToast({
                message: sessionId
                    ? t.adminTheoryPlanningSessionLinkSuccess
                    : t.adminTheoryPlanningSessionUnlinkSuccess,
                tone: "success",
            })
            await loadGroups()
        } catch (e) {
            setToast({
                message:
                    e instanceof Error && e.message.trim()
                        ? e.message
                        : t.adminTheoryPlanningSaveError,
                tone: "error",
            })
        } finally {
            setSessionBusy(false)
        }
    }

    const statusFilters = useMemo(
        () =>
            [
                { value: "" as const, label: t.adminTheoryPlanningFilterAll },
                { value: "draft" as const, label: t.adminTheoryPlanningStatusDraft },
                { value: "scheduled" as const, label: t.adminTheoryPlanningStatusScheduled },
                { value: "completed" as const, label: t.adminTheoryPlanningStatusCompleted },
                { value: "cancelled" as const, label: t.adminTheoryPlanningStatusCancelled },
            ] as const,
        [t]
    )

    const slotFilters = useMemo(
        () =>
            [
                { value: "" as const, label: t.adminTheoryPlanningFilterAll },
                { value: "1" as const, label: t.adminTheoryPlanningSlot1 },
                { value: "2" as const, label: t.adminTheoryPlanningSlot2 },
            ] as const,
        [t]
    )

    const members = detail?.members ?? []

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <p className="max-w-2xl text-sm text-slate-400">{t.adminTheoryPlanningSubtitle}</p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => void loadGroups()}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                    >
                        {t.adminTheoryPlanningRefresh}
                    </button>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="rounded-lg border border-blue-400/40 bg-blue-500/20 px-3 py-2 text-xs font-bold text-blue-100 transition hover:bg-blue-500/30"
                    >
                        {t.adminTheoryPlanningCreate}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2" role="group" aria-label={t.adminTheoryPlanningFilterStatus}>
                    {statusFilters.map((item) => (
                        <button
                            key={`status-${item.value || "all"}`}
                            type="button"
                            onClick={() => setStatusFilter(item.value)}
                            className={[
                                "rounded-lg px-3 py-2 text-xs font-bold transition",
                                statusFilter === item.value
                                    ? "border border-blue-400/40 bg-blue-500/20 text-blue-100"
                                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                            ].join(" ")}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t.adminTheoryPlanningFilterSlot}>
                    {slotFilters.map((item) => (
                        <button
                            key={`slot-${item.value || "all"}`}
                            type="button"
                            onClick={() => setSlotFilter(item.value)}
                            className={[
                                "rounded-lg px-3 py-2 text-xs font-bold transition",
                                slotFilter === item.value
                                    ? "border border-amber-400/40 bg-amber-500/15 text-amber-100"
                                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                            ].join(" ")}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400">{t.adminTheoryPlanningLoading}</p>
            ) : error ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={() => void loadGroups()}
                        className="mt-2 text-xs font-bold underline"
                    >
                        {t.adminTheoryPlanningRetry}
                    </button>
                </div>
            ) : groups.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                    {t.adminTheoryPlanningEmpty}
                </p>
            ) : (
                <>
                    <ul className="grid gap-3 lg:hidden">
                        {groups.map((group) => {
                            const selected = selectedId === group.id
                            return (
                                <li
                                    key={group.id}
                                    className={[
                                        "rounded-2xl border p-4",
                                        selected
                                            ? "border-blue-400/40 bg-blue-500/10"
                                            : "border-white/10 bg-gradient-to-br from-[#111827] to-[#0a0f1a]",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-100">
                                                {group.title?.trim() || t.adminTheoryPlanningUntitled}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {slotLabel(group.theory_slot)} · {group.member_count}{" "}
                                                {t.adminTheoryPlanningColMembers.toLowerCase()}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(group.status)}`}
                                        >
                                            {statusLabel(group.status)}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-xs text-slate-400">
                                        {t.adminTheoryPlanningColTentative}:{" "}
                                        {formatDateTimePair(
                                            group.tentative_date,
                                            group.tentative_time,
                                            t.adminTheoryPlanningNoDate
                                        )}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {t.adminTheoryPlanningColSession}:{" "}
                                        {group.session_id
                                            ? `${group.session_id.slice(0, 8)}…`
                                            : t.adminTheoryPlanningSessionNone}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(group.id)}
                                        className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                                    >
                                        {selected
                                            ? t.adminTheoryPlanningSelected
                                            : t.adminTheoryPlanningSelectGroup}
                                    </button>
                                </li>
                            )
                        })}
                    </ul>

                    <div className="hidden overflow-x-auto rounded-2xl border border-white/10 lg:block">
                        <table className="min-w-full text-left text-sm">
                            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">
                                        {t.adminTheoryPlanningColTitle}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        {t.adminTheoryPlanningColStatus}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        {t.adminTheoryPlanningColSlot}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        {t.adminTheoryPlanningColMembers}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        {t.adminTheoryPlanningColTentative}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        {t.adminTheoryPlanningColSession}
                                    </th>
                                    <th className="px-4 py-3 font-semibold">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => {
                                    const selected = selectedId === group.id
                                    return (
                                        <tr
                                            key={group.id}
                                            className={[
                                                "border-b border-white/5",
                                                selected ? "bg-blue-500/10" : "hover:bg-white/[0.03]",
                                            ].join(" ")}
                                        >
                                            <td className="px-4 py-3 font-medium text-slate-100">
                                                {group.title?.trim() || t.adminTheoryPlanningUntitled}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(group.status)}`}
                                                >
                                                    {statusLabel(group.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {slotLabel(group.theory_slot)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {group.member_count}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">
                                                {formatDateTimePair(
                                                    group.tentative_date,
                                                    group.tentative_time,
                                                    t.adminTheoryPlanningNoDate
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                                {group.session_id
                                                    ? `${group.session_id.slice(0, 8)}…`
                                                    : t.adminTheoryPlanningNoDate}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedId(group.id)}
                                                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                                                >
                                                    {selected
                                                        ? t.adminTheoryPlanningSelected
                                                        : t.adminTheoryPlanningSelectGroup}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {selectedId ? (
                <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#111827] to-[#0a0f1a] p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-base font-bold text-slate-100">
                            {t.adminTheoryPlanningDetailTitle}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setSelectedId(null)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                        >
                            {t.adminTheoryPlanningDetailClose}
                        </button>
                    </div>

                    {detailLoading ? (
                        <p className="text-sm text-slate-400">{t.adminTheoryPlanningLoading}</p>
                    ) : detailError ? (
                        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            <p>{detailError}</p>
                            <button
                                type="button"
                                onClick={() => selectedId && void loadDetail(selectedId)}
                                className="mt-2 text-xs font-bold underline"
                            >
                                {t.adminTheoryPlanningRetry}
                            </button>
                        </div>
                    ) : detail ? (
                        <div className="space-y-6">
                            {isReadMostly ? (
                                <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                    {t.adminTheoryPlanningReadOnly}
                                </p>
                            ) : null}

                            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                                {t.adminTheoryPlanningMinMembersHint.replace(
                                    "{count}",
                                    String(THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED)
                                )}
                            </p>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block text-sm">
                                    <span className="mb-1.5 block font-semibold text-slate-300">
                                        {t.adminTheoryPlanningFieldTitle}
                                    </span>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        disabled={isReadMostly || editSubmitting}
                                        maxLength={200}
                                        placeholder={t.adminTheoryPlanningFieldTitlePlaceholder}
                                        className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50 disabled:opacity-60"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1.5 block font-semibold text-slate-300">
                                        {t.adminTheoryPlanningFieldSlot}
                                    </span>
                                    <input
                                        type="text"
                                        value={slotLabel(detail.theory_slot)}
                                        disabled
                                        className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-400 outline-none disabled:opacity-80"
                                    />
                                </label>
                                <label className="block text-sm md:col-span-2">
                                    <span className="mb-1.5 block font-semibold text-slate-300">
                                        {t.adminTheoryPlanningFieldNotes}
                                    </span>
                                    <textarea
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        disabled={isReadMostly || editSubmitting}
                                        maxLength={2000}
                                        rows={3}
                                        placeholder={t.adminTheoryPlanningFieldNotesPlaceholder}
                                        className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50 disabled:opacity-60"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1.5 block font-semibold text-slate-300">
                                        {t.adminTheoryPlanningFieldStatus}
                                    </span>
                                    <select
                                        value={editStatus}
                                        onChange={(e) =>
                                            setEditStatus(e.target.value as TheoryPlanningStatus)
                                        }
                                        disabled={isReadMostly || editSubmitting}
                                        className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50 disabled:opacity-60"
                                    >
                                        {THEORY_PLANNING_STATUSES.map((status) => {
                                            const scheduleBlocked =
                                                status === "scheduled" && !canSchedule
                                            return (
                                                <option
                                                    key={status}
                                                    value={status}
                                                    disabled={
                                                        scheduleBlocked && editStatus !== "scheduled"
                                                    }
                                                >
                                                    {statusLabel(status)}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </label>
                                <div className="text-sm text-slate-400 md:flex md:items-end md:pb-2">
                                    {t.adminTheoryPlanningColMembers}: {memberCount} /{" "}
                                    {THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED}
                                </div>
                                <DateTimeField
                                    type="date"
                                    label={t.adminTheoryPlanningFieldTentativeDate}
                                    value={editTentativeDate}
                                    onChange={(e) => setEditTentativeDate(e.target.value)}
                                    disabled={isReadMostly || editSubmitting}
                                />
                                <DateTimeField
                                    type="time"
                                    label={t.adminTheoryPlanningFieldTentativeTime}
                                    value={editTentativeTime}
                                    onChange={(e) => setEditTentativeTime(e.target.value)}
                                    disabled={isReadMostly || editSubmitting}
                                />
                                <DateTimeField
                                    type="date"
                                    label={t.adminTheoryPlanningFieldConfirmedDate}
                                    value={editConfirmedDate}
                                    onChange={(e) => setEditConfirmedDate(e.target.value)}
                                    disabled={isReadMostly || editSubmitting}
                                />
                                <DateTimeField
                                    type="time"
                                    label={t.adminTheoryPlanningFieldConfirmedTime}
                                    value={editConfirmedTime}
                                    onChange={(e) => setEditConfirmedTime(e.target.value)}
                                    disabled={isReadMostly || editSubmitting}
                                />
                            </div>

                            {!canSchedule && editStatus === "scheduled" ? (
                                <p className="text-sm text-amber-200">
                                    {t.adminTheoryPlanningMinMembersBlocked
                                        .replace(
                                            "{count}",
                                            String(THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED)
                                        )
                                        .replace("{current}", String(memberCount))}
                                </p>
                            ) : null}

                            {editError ? (
                                <p className="text-sm text-red-300" role="alert">
                                    {editError}
                                </p>
                            ) : null}

                            {!isReadMostly ? (
                                <button
                                    type="button"
                                    onClick={() => void submitEdit()}
                                    disabled={editSubmitting}
                                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-60"
                                >
                                    {editSubmitting
                                        ? t.adminTheoryPlanningSaving
                                        : t.adminTheoryPlanningSave}
                                </button>
                            ) : null}

                            <div className="border-t border-white/10 pt-5">
                                <h3 className="text-sm font-bold text-slate-100">
                                    {t.adminTheoryPlanningSessionTitle}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    {detail.session_id
                                        ? detail.session_id
                                        : t.adminTheoryPlanningSessionNone}
                                </p>
                                {detail.session_id && linkedSessionUnavailable ? (
                                    <p className="mt-2 text-xs text-amber-200">
                                        {t.adminTheoryPlanningSessionUnavailable}
                                    </p>
                                ) : null}
                                {!isReadMostly ? (
                                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                                        <label className="block min-w-0 flex-1 text-sm">
                                            <span className="mb-1.5 block font-semibold text-slate-300">
                                                {t.adminTheoryPlanningSessionPlaceholder}
                                            </span>
                                            {sessionsLoading ? (
                                                <p className="text-xs text-slate-400">
                                                    {t.adminTheoryPlanningSessionLoading}
                                                </p>
                                            ) : sessionsError ? (
                                                <p className="text-xs text-red-300">{sessionsError}</p>
                                            ) : (
                                                <select
                                                    value={selectedSessionId}
                                                    onChange={(e) =>
                                                        setSelectedSessionId(e.target.value)
                                                    }
                                                    disabled={sessionBusy}
                                                    className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50 disabled:opacity-60"
                                                >
                                                    <option value="">
                                                        {t.adminTheoryPlanningSessionPlaceholder}
                                                    </option>
                                                    {sessionSelectOptions.map((session) => (
                                                        <option key={session.id} value={session.id}>
                                                            {session.unavailable
                                                                ? `${t.adminTheoryPlanningSessionUnavailableOption} · ${session.id.slice(0, 8)}…`
                                                                : (session.title?.trim() ||
                                                                      session.id.slice(0, 8)) +
                                                                  (session.date
                                                                      ? ` · ${session.date}`
                                                                      : "") +
                                                                  (session.time
                                                                      ? ` · ${toTimeInputValue(session.time)}`
                                                                      : "")}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                            {!sessionsLoading &&
                                            !sessionsError &&
                                            theorySessions.length === 0 ? (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {t.adminTheoryPlanningSessionEmpty}
                                                </p>
                                            ) : null}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={
                                                    sessionBusy ||
                                                    !selectedSessionId ||
                                                    selectedSessionId === (detail.session_id ?? "")
                                                }
                                                onClick={() => void linkSession(selectedSessionId)}
                                                className="rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-100 transition hover:bg-sky-500/25 disabled:opacity-50"
                                            >
                                                {t.adminTheoryPlanningSessionLink}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={sessionBusy || !detail.session_id}
                                                onClick={() => void linkSession(null)}
                                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                                            >
                                                {t.adminTheoryPlanningSessionUnlink}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="border-t border-white/10 pt-5">
                                <h3 className="text-sm font-bold text-slate-100">
                                    {t.adminTheoryPlanningMembersTitle}
                                </h3>
                                {wouldBreakScheduledMinimum ? (
                                    <p className="mt-2 text-xs text-amber-200">
                                        {t.adminTheoryPlanningMemberRemoveBlockedScheduled.replace(
                                            "{count}",
                                            String(THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED)
                                        )}
                                    </p>
                                ) : null}
                                {members.length === 0 ? (
                                    <p className="mt-2 text-sm text-slate-400">
                                        {t.adminTheoryPlanningMembersEmpty}
                                    </p>
                                ) : (
                                    <ul className="mt-3 space-y-2">
                                        {members.map((member) => (
                                            <li
                                                key={member.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-slate-100">
                                                        {studentDisplayName(member)}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">
                                                        {member.email ?? "—"}
                                                    </p>
                                                </div>
                                                {!isReadMostly ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (wouldBreakScheduledMinimum) {
                                                                setToast({
                                                                    message:
                                                                        t.adminTheoryPlanningMemberRemoveBlockedScheduled.replace(
                                                                            "{count}",
                                                                            String(
                                                                                THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED
                                                                            )
                                                                        ),
                                                                    tone: "error",
                                                                })
                                                                return
                                                            }
                                                            setRemoveTarget(member)
                                                        }}
                                                        className="rounded-lg border border-red-400/35 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-100 transition hover:bg-red-500/25"
                                                    >
                                                        {t.adminTheoryPlanningMemberRemove}
                                                    </button>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {!isReadMostly && isTheoryPlanningActiveStatus(detail.status) ? (
                                <div className="border-t border-white/10 pt-5">
                                    <h3 className="text-sm font-bold text-slate-100">
                                        {t.adminTheoryPlanningAddMemberTitle}
                                    </h3>
                                    <label className="mt-3 block text-sm">
                                        <span className="sr-only">
                                            {t.adminTheoryPlanningEligibleSearch}
                                        </span>
                                        <input
                                            type="search"
                                            value={eligibleSearch}
                                            onChange={(e) => setEligibleSearch(e.target.value)}
                                            placeholder={t.adminTheoryPlanningEligibleSearch}
                                            className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50"
                                        />
                                    </label>
                                    {eligibleLoading ? (
                                        <p className="mt-3 text-sm text-slate-400">
                                            {t.adminTheoryPlanningEligibleLoading}
                                        </p>
                                    ) : eligibleError ? (
                                        <p className="mt-3 text-sm text-red-300">{eligibleError}</p>
                                    ) : eligible.length === 0 ? (
                                        <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                                            {t.adminTheoryPlanningEligibleEmpty}
                                        </p>
                                    ) : filteredEligible.length === 0 ? (
                                        <p className="mt-3 text-sm text-slate-400">
                                            {t.adminTheoryPlanningEligibleNoneMatch}
                                        </p>
                                    ) : (
                                        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                                            {filteredEligible.map((student) => (
                                                <li
                                                    key={student.id}
                                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-100">
                                                            {studentDisplayName(student)}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-500">
                                                            {student.email}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={addingStudentId !== null}
                                                        onClick={() => void addMember(student.id)}
                                                        className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-60"
                                                    >
                                                        {addingStudentId === student.id
                                                            ? t.saving
                                                            : t.adminTheoryPlanningAddMember}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </section>
            ) : null}

            {createOpen ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="theory-planning-create-title"
                    className="fixed inset-0 z-[62] flex items-center justify-center bg-black/70 p-4 sm:p-5"
                    onClick={createSubmitting ? undefined : closeCreate}
                >
                    <div
                        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-blue-400/30 bg-gradient-to-br from-[#111827] to-[#0B0F1A] p-5 shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <h2
                            id="theory-planning-create-title"
                            className="text-lg font-bold text-slate-100"
                        >
                            {t.adminTheoryPlanningCreateTitle}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            {t.adminTheoryPlanningCreateDescription}
                        </p>

                        <div className="mt-4 space-y-4">
                            <fieldset>
                                <legend className="mb-1.5 text-sm font-semibold text-slate-300">
                                    {t.adminTheoryPlanningFieldSlot}
                                </legend>
                                <div className="flex gap-2">
                                    {([1, 2] as const).map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() => setCreateSlot(slot)}
                                            className={[
                                                "rounded-lg px-3 py-2 text-xs font-bold transition",
                                                createSlot === slot
                                                    ? "border border-amber-400/40 bg-amber-500/15 text-amber-100"
                                                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                                            ].join(" ")}
                                        >
                                            {slotLabel(slot)}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <label className="block text-sm">
                                <span className="mb-1.5 block font-semibold text-slate-300">
                                    {t.adminTheoryPlanningFieldTitle}
                                </span>
                                <input
                                    type="text"
                                    value={createTitle}
                                    onChange={(e) => setCreateTitle(e.target.value)}
                                    maxLength={200}
                                    placeholder={t.adminTheoryPlanningFieldTitlePlaceholder}
                                    className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50"
                                />
                            </label>

                            <label className="block text-sm">
                                <span className="mb-1.5 block font-semibold text-slate-300">
                                    {t.adminTheoryPlanningFieldNotes}
                                </span>
                                <textarea
                                    value={createNotes}
                                    onChange={(e) => setCreateNotes(e.target.value)}
                                    maxLength={2000}
                                    rows={3}
                                    placeholder={t.adminTheoryPlanningFieldNotesPlaceholder}
                                    className="w-full rounded-xl border border-white/10 bg-[#0B1120] px-3 py-2.5 text-slate-100 outline-none focus:border-blue-400/50"
                                />
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <DateTimeField
                                    type="date"
                                    label={t.adminTheoryPlanningFieldTentativeDate}
                                    value={createDate}
                                    onChange={(e) => setCreateDate(e.target.value)}
                                />
                                <DateTimeField
                                    type="time"
                                    label={t.adminTheoryPlanningFieldTentativeTime}
                                    value={createTime}
                                    onChange={(e) => setCreateTime(e.target.value)}
                                />
                            </div>

                            {createError ? (
                                <p className="text-sm text-red-300" role="alert">
                                    {createError}
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeCreate}
                                disabled={createSubmitting}
                                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                            >
                                {t.close}
                            </button>
                            <button
                                type="button"
                                onClick={() => void submitCreate()}
                                disabled={createSubmitting}
                                className="rounded-lg border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-bold text-blue-100 transition hover:bg-blue-500/30 disabled:opacity-60"
                            >
                                {createSubmitting
                                    ? t.creating
                                    : t.adminTheoryPlanningCreateSubmit}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <CancelSessionConfirmModal
                open={removeTarget !== null}
                sessionSummary={
                    removeTarget
                        ? `${studentDisplayName(removeTarget)} · ${removeTarget.email ?? ""}`
                        : ""
                }
                title={t.adminTheoryPlanningMemberRemoveTitle}
                description={t.adminTheoryPlanningMemberRemoveDescription}
                confirmText={t.adminTheoryPlanningMemberRemoveConfirm}
                onClose={() => setRemoveTarget(null)}
                onConfirm={async () => {
                    if (!detail || !removeTarget) return
                    if (
                        detail.status === "scheduled" &&
                        memberCount - 1 < THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED
                    ) {
                        throw new Error(
                            t.adminTheoryPlanningMemberRemoveBlockedScheduled.replace(
                                "{count}",
                                String(THEORY_PLANNING_MIN_MEMBERS_FOR_SCHEDULED)
                            )
                        )
                    }
                    const res = await fetch(
                        `/api/admin/theory-planning/groups/${detail.id}/members/${removeTarget.student_id}`,
                        {
                            method: "DELETE",
                            credentials: "include",
                            cache: "no-store",
                        }
                    )
                    const payload = await readJson(res)
                    if (!res.ok) {
                        throw new Error(
                            mapTheoryPlanningError(
                                typeof payload.code === "string" ? payload.code : undefined,
                                typeof payload.error === "string" && payload.error.trim()
                                    ? payload.error
                                    : t.adminTheoryPlanningMemberRemoveError,
                                t
                            )
                        )
                    }
                    setToast({
                        message: t.adminTheoryPlanningMemberRemoveSuccess,
                        tone: "success",
                    })
                    await loadDetail(detail.id)
                    await loadGroups()
                    if (isTheoryPlanningActiveStatus(detail.status)) {
                        const slot = detail.theory_slot === 2 ? 2 : 1
                        await loadEligible(slot)
                    }
                }}
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
