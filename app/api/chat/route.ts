import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/authz"
import { createClient } from "@/lib/supabase/server"
import { streamAiResponse } from "@/lib/ai-provider"
import { advanceRelationship, buildNoraSystemPrompt, normalizeRelationship, extractMemories } from "@/lib/nora-core"
import type { NoraMemory } from "@/lib/types"

export const dynamic = "force-dynamic"

function memoryTokens(text: string) {
  return new Set(
    text
      .toLocaleLowerCase("fa")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  )
}

async function getNoraContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noraId: string,
  userId: string,
  currentMessage: string,
  maxItems = 30,
) {
  const { data: memories } = await supabase
    .from("nora_memory")
    .select("*")
    .eq("nora_id", noraId)
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200)

  const query = memoryTokens(currentMessage)
  return (memories || [])
    .map((memory) => {
      const contentTokens = memoryTokens(`${memory.content} ${memory.memory_type || ""}`)
      let overlap = 0
      for (const token of query) if (contentTokens.has(token)) overlap += 1
      return { memory, score: overlap * 4 + Number(memory.importance || 5) * 0.5 }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map(({ memory }) => memory) as NoraMemory[]
}

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
    .select("id,name,system_prompt,personality,settings,is_active")
    .eq("id", ctx.profile.nora_id)
    .maybeSingle()
  if (instanceError || !instance) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })
  if (instance.is_active === false) return NextResponse.json({ error: "نورا در حال حاضر غیرفعال است." }, { status: 503 })

  const settings = (instance.settings && typeof instance.settings === "object" ? instance.settings : {}) as Record<string, unknown>
  const memoryEnabled = settings.memory_enabled !== false
  const memoryAutoSave = settings.memory_auto_save !== false
  const memoryMinImportance = Math.max(1, Math.min(10, Number(settings.memory_min_importance) || 6))

  const { data: existing } = await supabase
    .from("nora_conversations")
    .select("id,title,metadata")
    .eq("nora_id", instance.id)
    .eq("user_id", ctx.authUser.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let conversationId: string
  let title: string
  let conversationMetadata: Record<string, unknown> = {}
  let history: Array<{ role: "user" | "assistant"; content: string }> = []

  if (existing?.id) {
    conversationId = existing.id
    title = existing.title || userContent.slice(0, 80)
    conversationMetadata = (existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {}) as Record<string, unknown>
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
      .select("id,metadata")
      .single()
    if (error || !created) return NextResponse.json({ error: "ساخت گفتگو ناموفق بود." }, { status: 500 })
    conversationId = created.id
    conversationMetadata = {}
  }

  const userMessage = { role: "user" as const, content: userContent }
  const previousLast = history.at(-1)
  if (!(previousLast?.role === "user" && previousLast.content === userContent)) {
    const { error } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "user", content: userContent, metadata: {} })
    if (error) return NextResponse.json({ error: "ذخیره پیام ناموفق بود." }, { status: 500 })
    history.push(userMessage)
  }

  const memories = memoryEnabled ? await getNoraContext(supabase, instance.id, ctx.authUser.id, userContent) : []
  const relationship = normalizeRelationship(conversationMetadata.relationship)
  const systemPrompt = buildNoraSystemPrompt({
    name: instance.name,
    systemPrompt: instance.system_prompt,
    personality: instance.personality,
    memories,
    relationship,
  })
  const aiMessages = [{ role: "system" as const, content: systemPrompt }, ...history.slice(-20)]
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
        const nextRelationship = advanceRelationship(relationship)
        const nextMetadata = { ...conversationMetadata, relationship: nextRelationship }

        await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "assistant", content: fullContent.trim(), metadata: providerInfo })
        await supabase.from("nora_conversations").update({ title, updated_at: new Date().toISOString(), metadata: nextMetadata }).eq("id", conversationId)

        if (memoryEnabled && memoryAutoSave) {
          // Learn only durable, user-provided facts; never store the whole conversation as memory.
          const extracted = await extractMemories(userContent, fullContent.trim())
          for (const memory of extracted) {
            const content = String(memory.content).trim().slice(0, 1000)
            const memoryType = String(memory.type || "fact").slice(0, 50)
            const importance = Math.max(1, Math.min(10, Number(memory.importance) || 5))
            if (importance < memoryMinImportance) continue
            const duplicate = memories.some((m) => m.content.trim().toLowerCase() === content.toLowerCase())
            if (!duplicate && content) {
              await supabase.from("nora_memory").insert({
                nora_id: instance.id,
                user_id: ctx.authUser.id,
                memory_type: memoryType,
                content,
                importance,
                metadata: { source: "conversation", conversation_id: conversationId },
              })
            }
          }
        }

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
