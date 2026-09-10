"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { NoraMark } from "@/components/brand"
import { cn } from "@/lib/utils"

type Message = { role: "user" | "assistant"; content: string }
type Props = { email?: string | null; isOwner?: boolean }
type SpeechRecognitionEventLike = { results: { [index: number]: { [index: number]: { transcript: string } } } }
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechRecognitionEventLike) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor } }

function pickPersianVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fa"))
  return voices.find((v) => /female|زن|google.*persian/i.test(v.name)) || voices[0] || null
}

function cleanSpeech(text: string) {
  return text.replace(/```[\s\S]*?```/g, " ").replace(/`([^`]*)`/g, "$1").replace(/^\s*[-*•]\s+/gm, "").replace(/^\s*#{1,6}\s*/gm, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_~]+/g, "").replace(/[\\/|<>={}\[\]]+/g, " ").replace(/\s+/g, " ").trim()
}

export function ChatView({ email, isOwner }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [listening, setListening] = useState(false)
  const [voice, setVoice] = useState(true)
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, busy])

  useEffect(() => {
    let cancelled = false
    fetch("/api/chat", { cache: "no-store", headers: { accept: "application/json" } })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "تاریخچه گفتگو دریافت نشد.")
        if (!cancelled && Array.isArray(data.messages)) {
          setMessages(data.messages.filter((m: Message) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"))
        }
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "خطا در دریافت گفتگو") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function speak(text: string) {
    if (!voice || typeof window === "undefined" || !window.speechSynthesis) return
    const textToSpeak = cleanSpeech(text)
    if (!textToSpeak) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(textToSpeak)
    u.lang = "fa-IR"; u.rate = 0.94; u.pitch = 1.02
    const selected = pickPersianVoice(); if (selected) u.voice = selected
    window.speechSynthesis.speak(u)
  }

  async function sendText(contentOverride?: string) {
    const content = (contentOverride ?? input).trim()
    if (!content || busy || loading) return
    setInput(""); setError(null); setMessages((m) => [...m, { role: "user", content }]); setBusy(true)
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json", accept: "text/event-stream" }, cache: "no-store", body: JSON.stringify({ messages: [{ role: "user", content }] }) })
      if (!r.ok || !r.body) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `خطای سرویس (${r.status})`) }
      const reader = r.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let answer = ""; let finished = false; let streamError: string | null = null
      const handle = (line: string) => {
        if (!line.startsWith("data:")) return
        try {
          const e = JSON.parse(line.slice(5).trim())
          if (e.type === "delta" && typeof e.content === "string") {
            answer += e.content
            setMessages((current) => {
              const next = [...current]; const last = next[next.length - 1]
              if (last?.role === "assistant") next[next.length - 1] = { role: "assistant", content: answer }
              else next.push({ role: "assistant", content: answer })
              return next
            })
          } else if (e.type === "done") finished = true
          else if (e.type === "error") streamError = e.error || "نورا پاسخ نداد."
        } catch {}
      }
      while (true) {
        const { value, done } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() || ""; lines.forEach((line) => handle(line.trim()))
      }
      buffer += decoder.decode(); buffer.split("\n").forEach((line) => handle(line.trim()))
      if (streamError) throw new Error(streamError)
      if (!finished || !answer.trim()) throw new Error("پاسخ نورا کامل دریافت نشد.")
      speak(answer)
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته")
      setMessages((current) => current.filter((m, i) => !(i === current.length - 1 && m.role === "assistant" && !m.content.trim())))
    } finally { setBusy(false) }
  }

  function toggleListening() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined
    if (!Recognition) { setError("تشخیص صدای فارسی در این مرورگر در دسترس نیست."); return }
    const r = new Recognition(); r.lang = "fa-IR"; r.continuous = false; r.interimResults = false
    r.onresult = (e) => { const text = e.results[0]?.[0]?.transcript?.trim(); if (text) void sendText(text) }
    r.onerror = () => { setListening(false); setError("دریافت صدا ناموفق بود. اجازه میکروفون را بررسی کنید.") }
    r.onend = () => setListening(false); recognitionRef.current = r; setError(null); setListening(true); r.start()
  }

  const newChat = () => { if (!busy) { setMessages([]); setInput(""); setError(null) } }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-4 sm:px-6">
        <div className="flex items-center gap-3"><button onClick={() => setMenu((v) => !v)} className="rounded-xl p-2 hover:bg-muted md:hidden" aria-label="منو">{menu ? "×" : "☰"}</button><NoraMark className="h-9 w-9 rounded-xl" /><span className="font-bold">نورا</span></div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> آنلاین</div>
        <div className="flex items-center gap-1"><button onClick={newChat} disabled={busy} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"><span>＋</span><span className="hidden sm:inline">گفتگوی جدید</span></button><form action="/auth/sign-out" method="post"><button className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="خروج">↪</button></form></div>
      </header>
      {menu ? <div className="border-b border-border bg-card p-3 md:hidden"><button onClick={() => setMenu(false)} className="flex w-full rounded-xl p-3 text-right hover:bg-muted">◷ &nbsp; تاریخچه گفتگو</button>{isOwner ? <a href="/owner" className="mt-1 flex w-full rounded-xl p-3 text-right hover:bg-muted">پنل مالک</a> : null}{email ? <div dir="ltr" className="mt-2 truncate px-3 text-xs text-muted-foreground">{email}</div> : null}</div> : null}
      <section className="relative flex min-h-0 flex-1 flex-col">
        <div className={cn("flex-1 overflow-y-auto px-4 py-8 sm:px-6", messages.length === 0 && "flex flex-col")}>
          {loading ? <div className="flex flex-1 items-center justify-center text-xl animate-pulse">⋯</div> : messages.length === 0 ? <div className="m-auto w-full max-w-2xl text-center"><div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[28px] bg-primary/10 ring-1 ring-primary/20 shadow-2xl shadow-primary/10"><NoraMark className="h-16 w-16 rounded-3xl" /></div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">چه کاری برات انجام بدم؟</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">با نورا حرف بزن، سؤال بپرس یا یک کار را به او بسپار.</p><div className="mt-8 grid gap-2 sm:grid-cols-3"><button onClick={() => setInput("امروز چه کارهایی باید انجام بدم؟")} className="rounded-2xl border border-border bg-card/50 p-4 text-right text-sm hover:border-primary/40 hover:bg-card">برنامه امروز</button><button onClick={() => setInput("کمکم کن یک تصمیم مهم بگیرم")} className="rounded-2xl border border-border bg-card/50 p-4 text-right text-sm hover:border-primary/40 hover:bg-card">کمک برای تصمیم‌گیری</button><button onClick={() => setInput("آخرین گفتگوها و کارهای مهم من را یادآوری کن")} className="rounded-2xl border border-border bg-card/50 p-4 text-right text-sm hover:border-primary/40 hover:bg-card">یادآوری</button></div></div> : <div className="mx-auto w-full max-w-3xl space-y-6">{messages.map((m, i) => <div key={`${i}-${m.role}`} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}><div className={cn("max-w-[88%] whitespace-pre-wrap rounded-3xl px-5 py-3.5 text-[15px] leading-8", m.role === "user" ? "bg-muted" : "bg-primary/10 ring-1 ring-primary/15")}>{m.content}</div></div>)}{busy ? <div className="flex justify-end"><div className="rounded-3xl bg-primary/10 px-5 py-3.5 animate-pulse">⋯</div></div> : null}<div ref={endRef} /></div>}
          {error ? <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        </div>
        <div className="sticky bottom-0 px-4 pb-5 pt-3 sm:px-6"><form onSubmit={(e: FormEvent) => { e.preventDefault(); void sendText() }} className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-[24px] border border-border bg-card/90 p-2 shadow-2xl shadow-black/20 backdrop-blur-xl"><button type="button" onClick={toggleListening} disabled={busy || loading} className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition", listening ? "bg-primary text-primary-foreground" : "hover:bg-muted")} aria-label={listening ? "توقف گوش دادن" : "صحبت با نورا"}>{listening ? "■" : "♩"}</button><input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy || listening || loading} placeholder={listening ? "دارم گوش می‌دم..." : "با نورا صحبت کن..."} className="min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-muted-foreground"/><button type="button" onClick={() => { const next = !voice; setVoice(next); if (!next) window.speechSynthesis?.cancel() }} className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl hover:bg-muted sm:flex" aria-label={voice ? "خاموش کردن صدا" : "روشن کردن صدا"}>{voice ? "◖" : "◗"}</button><button type="submit" disabled={busy || loading || !input.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40" aria-label="ارسال">➤</button></form><p className="mt-2 text-center text-[11px] text-muted-foreground">نورا ممکن است اشتباه کند؛ اطلاعات مهم را بررسی کن.</p></div>
      </section>
    </div>
  )
}
