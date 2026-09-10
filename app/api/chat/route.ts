import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/authz"
import { createClient } from "@/lib/supabase/server"
import { streamAiResponse } from "@/lib/ai-provider"

export const dynamic = "force-dynamic"

export async function GET() {
  const ctx = await getSessionContext()
  if (!ctx) return NextResponse.json({ error: "برای گفتگو باید وارد حساب شوید." }, { status: 401 })
  if (!ctx.profile?.nora_id) return NextResponse.json({ error: "حساب شما به نمونه نورا متصل نیست." }, { status: 403 })

  const supabase = await createClient()
  const { data: conversation, error: conversationError } = await supabase
    .from("nora_conversations")
    .select("id,title,updated_at")
    .eq("nora_id", ctx.profile.nora_id)
    .eq("user_id", ctx.authUser.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (conversationError) return NextResponse.json({ error: "تاریخچه گفتگو دریافت نشد." }, { status: 500 })
  if (!conversation) return NextResponse.json({ conversation: null, messages: [] })

  const { data: messages, error: messagesError } = await supabase
    .from("nora_messages")
    .select("role,content,created_at")
    .eq("conversation_id", conversation.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(50)

  if (messagesError) return NextResponse.json({ error: "پیام‌های قبلی دریافت نشدند." }, { status: 500 })
  return NextResponse.json({
    conversation: { id: conversation.id, title: conversation.title, updatedAt: conversation.updated_at },
    messages: (messages || []).map((message) => ({ role: message.role, content: message.content })),
  })
}

export async function POST(request: Request) {
  const ctx = await getSessionContext()
  if (!ctx) return NextResponse.json({ error: "برای گفتگو باید وارد حساب شوید." }, { status: 401 })
  if (!ctx.profile?.nora_id) return NextResponse.json({ error: "حساب شما به نمونه نورا متصل نیست." }, { status: 403 })

  const body = await request.json().catch(() => null)
  const messages = Array.isArray(body?.messages) ? body.messages : []
  const lastUser = messages
    .filter((m: unknown) => {
      if (!m || typeof m !== "object") return false
      const item = m as Record<string, unknown>
      return item.role === "user" && typeof item.content === "string" && item.content.trim()
    })
    .at(-1)

  if (!lastUser || typeof lastUser.content !== "string") return NextResponse.json({ error: "پیام معتبری ارسال نشده است." }, { status: 400 })
  const userContent = lastUser.content.trim().slice(0, 12000)

  const supabase = await createClient()
  const { data: instance, error: instanceError } = await supabase
    .from("nora_instances")
    .select("id,system_prompt,is_active")
    .eq("id", ctx.profile.nora_id)
    .maybeSingle()
  if (instanceError || !instance) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })
  if (instance.is_active === false) return NextResponse.json({ error: "نورا در حال حاضر غیرفعال است." }, { status: 503 })

  const { data: existing } = await supabase
    .from("nora_conversations")
    .select("id,title")
    .eq("nora_id", instance.id)
    .eq("user_id", ctx.authUser.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let conversationId: string
  let title: string
  let history: Array<{ role: "user" | "assistant"; content: string }> = []

  if (existing?.id) {
    conversationId = existing.id
    title = existing.title || userContent.slice(0, 80)
    const { data: stored, error } = await supabase
      .from("nora_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(18)
    if (error) return NextResponse.json({ error: "تاریخچه گفتگو دریافت نشد." }, { status: 500 })
    history = (stored || []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
  } else {
    title = userContent.slice(0, 80)
    const { data: created, error } = await supabase
      .from("nora_conversations")
      .insert({ nora_id: instance.id, user_id: ctx.authUser.id, title, metadata: {} })
      .select("id")
      .single()
    if (error || !created) return NextResponse.json({ error: "ساخت گفتگو ناموفق بود." }, { status: 500 })
    conversationId = created.id
  }

  const userMessage = { role: "user" as const, content: userContent }
  const previousLast = history.at(-1)
  if (!(previousLast?.role === "user" && previousLast.content === userContent)) {
    const { error } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "user", content: userContent, metadata: {} })
    if (error) return NextResponse.json({ error: "ذخیره پیام ناموفق بود." }, { status: 500 })
    history.push(userMessage)
  }

  const aiMessages = [{ role: "system" as const, content: instance.system_prompt || "You are Nora, a personal AI assistant." }, ...history.slice(-20)]
  const encoder = new TextEncoder()
  let fullContent = ""
  let providerInfo = { model: "", provider: "" }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await streamAiResponse(aiMessages, (chunk) => {
          fullContent += chunk
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`))
        })
        providerInfo = { model: result.model, provider: result.provider }
        await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "assistant", content: fullContent.trim(), metadata: providerInfo })
        await supabase.from("nora_conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", conversationId)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", conversationId })}\n\n`))
        controller.close()
      } catch (error) {
        console.error("Nora AI streaming failed", error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "سرویس هوش مصنوعی پاسخ نداد." })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
