"use client"

import { useEffect, useState } from "react"
import { Brain, Pencil, Trash2, X, Check } from "lucide-react"

type Memory = {
  id: string
  user_id: string
  memory_type: string
  content: string
  importance: number
  updated_at: string
}

const labels: Record<string, string> = {
  fact: "واقعیت",
  preference: "ترجیح",
  goal: "هدف",
  relationship: "رابطه",
  context: "زمینه",
}

export function MemoryManager() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Memory | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/owner/memories", { cache: "no-store" })
    const data = await res.json()
    if (res.ok) setMemories(data.memories || [])
    else setError(data.error || "خطا در دریافت حافظه‌ها")
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function save() {
    if (!editing) return
    setBusy(true); setError("")
    const res = await fetch("/api/owner/memories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || "ذخیره ناموفق بود")
    else { setEditing(null); await load() }
    setBusy(false)
  }

  async function remove(id: string) {
    if (!window.confirm("این حافظه حذف شود؟")) return
    setBusy(true); setError("")
    const res = await fetch("/api/owner/memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || "حذف ناموفق بود")
    else setMemories((items) => items.filter((m) => m.id !== id))
    setBusy(false)
  }

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 lg:col-span-2">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-accent"><Brain className="h-5 w-5" /></span>
        <div><h2 className="font-semibold">حافظه نورا</h2><p className="text-xs text-muted-foreground">حافظه‌های بلندمدت را بررسی، اصلاح یا حذف کن.</p></div>
      </div>
      {error && <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      {loading ? <p className="text-sm text-muted-foreground">در حال بارگذاری...</p> : memories.length === 0 ? <p className="text-sm text-muted-foreground">هنوز حافظه‌ای ثبت نشده است.</p> : (
        <div className="space-y-2">
          {memories.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/40 p-3">
              <div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px]">{labels[m.memory_type] || m.memory_type}</span><span className="text-[11px] text-muted-foreground">اهمیت {m.importance}/10</span></div><p className="text-sm leading-6">{m.content}</p></div>
              <div className="flex shrink-0 gap-1"><button onClick={() => setEditing({ ...m })} className="rounded-lg p-2 hover:bg-muted" aria-label="ویرایش"><Pencil className="h-4 w-4" /></button><button disabled={busy} onClick={() => void remove(m.id)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
      )}
      {editing && <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">ویرایش حافظه</h3><button onClick={() => setEditing(null)}><X className="h-4 w-4" /></button></div>
        <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
        <div className="mt-3 flex flex-wrap items-center gap-2"><select value={editing.memory_type} onChange={(e) => setEditing({ ...editing, memory_type: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="fact">واقعیت</option><option value="preference">ترجیح</option><option value="goal">هدف</option><option value="relationship">رابطه</option><option value="context">زمینه</option></select><select value={editing.importance} onChange={(e) => setEditing({ ...editing, importance: Number(e.target.value) })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>اهمیت {i + 1}</option>)}</select><button disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" />ذخیره</button></div>
      </div>}
    </section>
  )
}
