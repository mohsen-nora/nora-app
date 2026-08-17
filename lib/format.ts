import type {
  NoraActivityLog,
  NoraCommand,
  NoraConversation,
  NoraInstance,
  NoraMemory,
  NoraMessage,
  NoraUser,
} from "@/lib/types"

const faDateTime = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
})

const faDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" })

/** Format an ISO timestamp to a Persian (Jalali) date-time string. */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return faDateTime.format(d)
}

export function formatDate(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return faDate.format(d)
}

/** Convert Western digits to Persian digits for numeric display. */
export function toFaDigits(input: string | number): string {
  const map = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
  return String(input).replace(/\d/g, (d) => map[Number(d)])
}

/* ---- Field resolvers: pick the first present value across schema variants ---- */

export function memoryTitle(m: NoraMemory): string {
  return m.title || m.key || m.category || "خاطره"
}

export function memoryContent(m: NoraMemory): string {
  return m.content || m.value || ""
}

export function conversationTitle(c: NoraConversation): string {
  return c.title || "گفتگوی بدون عنوان"
}

export function messageContent(m: NoraMessage): string {
  return m.content || m.body || ""
}

export function messageRole(m: NoraMessage): string {
  return (m.role || m.sender || "user").toString().toLowerCase()
}

export function instanceName(i: NoraInstance): string {
  return i.name || "نورا"
}

export function userLabel(u: NoraUser): string {
  return u.display_name || u.full_name || u.email || u.id
}

export function commandName(c: NoraCommand): string {
  return c.name || c.command || "دستور"
}

export function commandEnabled(c: NoraCommand): boolean {
  if (typeof c.enabled === "boolean") return c.enabled
  if (typeof c.is_enabled === "boolean") return c.is_enabled
  return true
}

export function activityAction(a: NoraActivityLog): string {
  return a.action || a.event || a.type || "رویداد"
}

export function activityDetail(a: NoraActivityLog): string {
  return a.description || a.detail || ""
}

export interface StatusVisual {
  label: string
  dot: string
  text: string
  ring: string
}

/** Map a raw status string to Persian label + theme classes. */
export function statusVisual(status?: string | null): StatusVisual {
  const s = (status ?? "").toLowerCase()
  switch (s) {
    case "online":
    case "active":
    case "ready":
      return { label: "آنلاین", dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-400/30" }
    case "busy":
    case "processing":
      return { label: "مشغول", dot: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-400/30" }
    case "idle":
      return { label: "در حالت انتظار", dot: "bg-sky-400", text: "text-sky-300", ring: "ring-sky-400/30" }
    case "error":
    case "failed":
      return { label: "خطا", dot: "bg-rose-400", text: "text-rose-300", ring: "ring-rose-400/30" }
    case "offline":
    case "inactive":
      return { label: "آفلاین", dot: "bg-zinc-500", text: "text-zinc-400", ring: "ring-zinc-500/30" }
    default:
      return { label: status || "نامشخص", dot: "bg-zinc-500", text: "text-zinc-400", ring: "ring-zinc-500/30" }
  }
}

export function roleLabel(role?: string | null): string {
  const r = (role ?? "").toLowerCase()
  switch (r) {
    case "owner":
      return "مالک"
    case "admin":
      return "مدیر"
    case "user":
      return "کاربر"
    default:
      return role || "کاربر"
  }
}
