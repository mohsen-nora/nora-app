"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import { Loader2, Send } from "lucide-react"
import { Card } from "@/components/ui"
import { cn } from "@/lib/utils"

type Message = { role: "user" | "assistant"; content: string }

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy])

  async function send(event: FormEvent) {
    event.preventDefault()
    const content = input.trim()
    if (!content || busy) return

    setInput("")
    setError(null)
    const next = [...messages, { role: "user" as const, content }]
    setMessages(next)
    setBusy(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ messages: next }),
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

      setMessages((current) => [...current, { role: "assistant", content: data.content!.trim() }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex min-h-[32rem] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[24rem] items-center justify-center text-center text-sm text-muted-foreground">
            پیام خود را برای نورا بنویسید.
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
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} placeholder="پیام خود را برای نورا بنویسید..." className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="ارسال" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </Card>
  )
}
