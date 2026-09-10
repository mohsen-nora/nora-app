"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react"
import { Card } from "@/components/ui"
import { cn } from "@/lib/utils"

type Message = { role: "user" | "assistant"; content: string }
type SpeechRecognitionEventLike = { results: { [index: number]: { [index: number]: { transcript: string } } } }
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

function pickPersianVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  const fa = voices.filter((voice) => voice.lang.toLowerCase().startsWith("fa"))
  return fa.find((voice) => /female|زن|google.*persian/i.test(voice.name)) || fa[0] || null
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [listening, setListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy])

  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      try {
        const response = await fetch("/api/chat", { cache: "no-store", headers: { accept: "application/json" } })
        const raw = await response.text()
        const data = raw ? JSON.parse(raw) : {}
        if (!response.ok) throw new Error(data.error || "تاریخچه گفتگو دریافت نشد.")
        if (!cancelled && Array.isArray(data.messages)) {
          setMessages(data.messages.filter((message: Message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string"))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "خطای دریافت تاریخچه")
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }
    void loadHistory()
    return () => { cancelled = true }
  }, [])

  function speak(text: string) {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "fa-IR"
    utterance.rate = 0.95
    utterance.pitch = 1.05
    const voice = pickPersianVoice()
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }

  async function sendText(contentOverride?: string) {
    const content = (contentOverride ?? input).trim()
    if (!content || busy || loadingHistory) return

    setInput("")
    setError(null)
    setMessages((current) => [...current, { role: "user", content }])
    setBusy(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ messages: [{ role: "user", content }] }),
      })

      const raw = await response.text()
      let data: { content?: string; error?: string } = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        throw new Error(`خطای سرور نورا (HTTP ${response.status})`)
      }

      if (!response.ok) throw new Error(data.error || `پاسخ نورا دریافت نشد (HTTP ${response.status})`)
      if (typeof data.content !== "string" || !data.content.trim()) throw new Error("پاسخ نورا خالی بود.")

      const answer = data.content.trim()
      setMessages((current) => [...current, { role: "assistant", content: answer }])
      speak(answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setBusy(false)
    }
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined
    if (!Recognition) {
      setError("تشخیص صدای فارسی در این مرورگر در دسترس نیست. Chrome روی اندروید را امتحان کنید.")
      return
    }

    const recognition = new Recognition()
    recognition.lang = "fa-IR"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) void sendText(transcript)
    }
    recognition.onerror = () => {
      setListening(false)
      setError("دریافت صدا ناموفق بود. اجازه میکروفون را بررسی کنید.")
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setError(null)
    setListening(true)
    recognition.start()
  }

  return (
    <Card className="flex min-h-[32rem] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loadingHistory ? (
          <div className="flex h-full min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="ml-2 h-4 w-4 animate-spin" /> در حال بارگذاری گفتگو...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[24rem] items-center justify-center text-center text-sm text-muted-foreground">
            با نورا حرف بزنید یا پیام خود را بنویسید.
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={`${index}-${message.role}`} className={cn("flex", message.role === "user" ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap", message.role === "user" ? "bg-muted" : "bg-primary/15 ring-1 ring-primary/20")}>
                {message.content}
              </div>
            </div>
          ))
        )}
        {busy ? <div className="flex justify-end"><div className="rounded-2xl bg-primary/10 px-4 py-3"><Loader2 className="h-4 w-4 animate-spin" /></div></div> : null}
        <div ref={endRef} />
      </div>
      {error ? <p className="border-t border-border px-4 py-2 text-sm text-rose-400">{error}</p> : null}
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void sendText() }} className="flex gap-2 border-t border-border p-3">
        <button type="button" onClick={toggleListening} disabled={busy || loadingHistory} aria-label={listening ? "توقف ضبط صدا" : "صحبت با نورا"} title={listening ? "توقف ضبط صدا" : "صحبت با نورا"} className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-border", listening ? "bg-primary text-primary-foreground" : "bg-background")}>
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy || listening || loadingHistory} placeholder={listening ? "نورا گوش می‌دهد..." : "با نورا صحبت کنید یا پیام بنویسید..."} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <button type="button" onClick={() => { setVoiceEnabled((value) => { const next = !value; if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel(); return next }) }} aria-label={voiceEnabled ? "خاموش کردن صدای نورا" : "روشن کردن صدای نورا"} title={voiceEnabled ? "خاموش کردن صدای نورا" : "روشن کردن صدای نورا"} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-border">
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button type="submit" disabled={busy || loadingHistory || !input.trim()} aria-label="ارسال" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </Card>
  )
}
