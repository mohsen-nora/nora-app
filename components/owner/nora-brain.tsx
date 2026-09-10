"use client"

import { useEffect, useState } from "react"
import { Brain, HeartHandshake, RefreshCcw, Save, UserRound } from "lucide-react"

type Profile = {
  communication_style?: "short" | "detailed" | "mixed"
  tone_preference?: "warm" | "direct" | "formal" | "casual" | "mixed"
  interests: string[]
  goals: string[]
  ongoing_projects: string[]
  preferences: string[]
  dislikes: string[]
  decision_style?: "fast" | "analytical" | "balanced"
  confidence: number
  updated_at?: string
}

type Relationship = {
  familiarity: number
  trust: number
  closeness: number
  humor: number
  supportiveness: number
  conversations: number
  lastInteractionAt?: string
}

type BrainData = { profile: Profile; relationship: Relationship; memoryCount: number }

const defaults: Profile = { interests: [], goals: [], ongoing_projects: [], preferences: [], dislikes: [], confidence: 0 }

function listText(values: string[]) { return values.join("\n") }
function parseList(value: string) { return value.split("\n").map((v) => v.trim()).filter(Boolean).slice(0, 30) }

export function NoraBrain() {
  const [data, setData] = useState<BrainData | null>(null)
  const [profile, setProfile] = useState<Profile>(defaults)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function load() {
    setLoading(true); setError("")
    const res = await fetch("/api/owner/brain", { cache: "no-store" })
    const json = await res.json()
    if (!res.ok) setError(json.error || "دریافت مغز نورا ناموفق بود")
    else { setData(json); setProfile(json.profile || defaults) }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function action(action: string, body: Record<string, unknown> = {}) {
    setBusy(true); setError(""); setMessage("")
    const res = await fetch("/api/owner/brain", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) })
    const json = await res.json()
    if (!res.ok) setError(json.error || "عملیات ناموفق بود")
    else { setMessage("انجام شد"); await load() }
    setBusy(false)
  }

  if (loading) return <section className="rounded-2xl border border-border bg-card/60 p-5 lg:col-span-2"><p className="text-sm text-muted-foreground">در حال بارگذاری مغز نورا...</p></section>

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 lg:col-span-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-accent"><Brain className="h-5 w-5" /></span><div><h2 className="font-semibold">مغز نورا</h2><p className="text-xs text-muted-foreground">پروفایل شناختی، رابطه و وضعیت حافظه را از یک‌جا کنترل کن.</p></div></div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"><RefreshCcw className="h-3.5 w-3.5" />به‌روزرسانی</button>
      </div>
      {error && <p className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
      {message && <p className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-background/40 p-4 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><UserRound className="h-4 w-4 text-accent" /><h3 className="font-medium">پروفایل شناختی</h3></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">سبک پاسخ<select value={profile.communication_style || "mixed"} onChange={(e) => setProfile({ ...profile, communication_style: e.target.value as Profile["communication_style"] })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="short">کوتاه</option><option value="mixed">ترکیبی</option><option value="detailed">مفصل</option></select></label>
            <label className="text-xs text-muted-foreground">لحن مورد علاقه<select value={profile.tone_preference || "mixed"} onChange={(e) => setProfile({ ...profile, tone_preference: e.target.value as Profile["tone_preference"] })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="warm">گرم</option><option value="direct">مستقیم</option><option value="casual">خودمانی</option><option value="formal">رسمی</option><option value="mixed">ترکیبی</option></select></label>
            <label className="text-xs text-muted-foreground">سبک تصمیم‌گیری<select value={profile.decision_style || "balanced"} onChange={(e) => setProfile({ ...profile, decision_style: e.target.value as Profile["decision_style"] })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="fast">سریع</option><option value="balanced">متعادل</option><option value="analytical">تحلیلی</option></select></label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["interests","goals","ongoing_projects","preferences","dislikes"] as const).map((key) => <label key={key} className="text-xs text-muted-foreground">{{ interests: "علایق", goals: "اهداف", ongoing_projects: "پروژه‌های جاری", preferences: "ترجیحات", dislikes: "موارد نامطلوب" }[key]}<textarea value={listText(profile[key])} onChange={(e) => setProfile({ ...profile, [key]: parseList(e.target.value) })} placeholder="هر مورد در یک خط" className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" /></label>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void action("save_profile", { profile })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" />ذخیره پروفایل</button><button disabled={busy} onClick={() => void action("reset_profile")} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">بازنشانی پروفایل</button></div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/40 p-4">
          <div className="mb-4 flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-accent" /><h3 className="font-medium">رابطه با کاربر</h3></div>
          <div className="space-y-3">{data && ([['آشنایی',data.relationship.familiarity],['اعتماد',data.relationship.trust],['صمیمیت',data.relationship.closeness],['شوخ‌طبعی',data.relationship.humor],['حمایت‌گری',data.relationship.supportiveness]] as [string,number][]).map(([label,value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="text-muted-foreground">{Math.round(value)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>)}</div>
          <div className="mt-5 space-y-1 text-xs text-muted-foreground"><p>تعداد گفتگوها: <span className="text-foreground">{data?.relationship.conversations ?? 0}</span></p><p>حافظه‌های ثبت‌شده: <span className="text-foreground">{data?.memoryCount ?? 0}</span></p></div>
          <button disabled={busy} onClick={() => { if (window.confirm("رابطه نورا با کاربر از ابتدا شروع شود؟")) void action("reset_relationship") }} className="mt-4 w-full rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10">بازنشانی رابطه</button>
        </div>
      </div>
    </section>
  )
}
