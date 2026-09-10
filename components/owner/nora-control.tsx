"use client"

import { useEffect, useState } from "react"
import { Brain, Save, Power } from "lucide-react"
import type { NoraInstance } from "@/lib/types"

export function NoraControl({ initial }: { initial: NoraInstance | null }) {
  const [instance, setInstance] = useState(initial)
  const [name, setName] = useState(initial?.name || "نورا")
  const [prompt, setPrompt] = useState(initial?.system_prompt || "")
  const [personality, setPersonality] = useState(JSON.stringify(initial?.personality || {}, null, 2))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    setInstance(initial)
  }, [initial])

  async function save() {
    setBusy(true)
    setMessage("")
    try {
      const parsed = JSON.parse(personality || "{}")
      const response = await fetch("/api/owner/nora-control", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, system_prompt: prompt, personality: parsed }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "خطا")
      setInstance(data.instance)
      setMessage("تنظیمات نورا ذخیره شد.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ذخیره تنظیمات ناموفق بود.")
    } finally {
      setBusy(false)
    }
  }

  async function toggle() {
    if (!instance) return
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/owner/nora-control", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !instance.is_active }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "خطا")
      setInstance(data.instance)
      setMessage(data.instance.is_active ? "نورا فعال شد." : "نورا غیرفعال شد.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 lg:col-span-2">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-accent">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">کنترل هسته نورا</h2>
            <p className="text-xs text-muted-foreground">هویت، شخصیت و رفتار پایه نورا</p>
          </div>
        </div>
        <button type="button" onClick={toggle} disabled={busy || !instance} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-50">
          <Power className="h-4 w-4" aria-hidden="true" />
          {instance?.is_active ? "فعال" : "غیرفعال"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          نام نورا
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <label className="flex flex-col gap-2 text-sm lg:row-span-2">
          شخصیت (JSON)
          <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} spellCheck={false} className="min-h-40 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          قوانین و هویت پایه
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={12000} className="min-h-40 rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary" />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">تغییرات این بخش مستقیماً روی پاسخ‌های بعدی نورا اثر می‌گذارد.</p>
        <div className="flex items-center gap-3">
          {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
          <button type="button" onClick={save} disabled={busy || !instance} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            <Save className="h-4 w-4" aria-hidden="true" />
            ذخیره
          </button>
        </div>
      </div>
    </section>
  )
}
