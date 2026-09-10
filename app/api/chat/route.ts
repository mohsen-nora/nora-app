import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/authz"
import { createClient } from "@/lib/supabase/server"
import { generateAiResponse } from "@/lib/ai-provider"

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
  const cleanMessages = messages
    .filter((m: unknown) => {
      if (!m || typeof m !== "object") return false
      const item = m as Record<string, unknown>
      return item.role === "user" && typeof item.content === "string" && item.content.trim()
    })
    .slice(-1)
    .map((m: Record<string, unknown>) => ({ role: "user" as const, content: String(m.content).trim().slice(0, 12000) }))

  const lastUser = cleanMessages[0]
  if (!lastUser) return NextResponse.json({ error: "پیام معتبری ارسال نشده است." }, { status: 400 })

  const supabase = await createClient()
  const { data: instance, error: instanceError } = await supabase
    .from("nora_instances")
    .select("id,name,system_prompt,is_active")
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
  let conversationTitle = existing?.title || lastUser.content.slice(0, 80)

  if (existing?.id) {
    conversationId = existing.id
    const { data: history, error: historyError } = await supabase
      .from("nora_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(20)

    if (historyError) return NextResponse.json({ error: "تاریخچه گفتگو دریافت نشد." }, { status: 500 })

    const previousMessages = (history || [])
      .reverse()
      .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }))

    const duplicateLastMessage = previousMessages.at(-1)?.role === "user" && previousMessages.at(-1)?.content === lastUser.content
    if (!duplicateLastMessage) {
      const { error } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "user", content: lastUser.content, metadata: {} })
      if (error) return NextResponse.json({ error: "ذخیره پیام ناموفق بود." }, { status: 500 })
      previousMessages.push(lastUser)
    }

    return await generateAndStoreResponse({ supabase, instance, conversationId, conversationTitle, messages: previousMessages })
  }

  const { data: created, error: createError } = await supabase
    .from("nora_conversations")
    .insert({ nora_id: instance.id, user_id: ctx.authUser.id, title: conversationTitle, metadata: {} })
    .select("id")
    .single()

  if (createError || !created) return NextResponse.json({ error: "ساخت گفتگو ناموفق بود." }, { status: 500 })
  conversationId = created.id

  const { error: userMessageError } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "user", content: lastUser.content, metadata: {} })
  if (userMessageError) return NextResponse.json({ error: "ذخیره پیام ناموفق بود." }, { status: 500 })

  return await generateAndStoreResponse({ supabase, instance, conversationId, conversationTitle, messages: [lastUser] })
}

async function generateAndStoreResponse({
  supabase,
  instance,
  conversationId,
  conversationTitle,
  messages,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  instance: { id: string; system_prompt: string | null }
  conversationId: string
  conversationTitle: string
  messages: Array<{ role: "user" | "assistant"; content: string }>
}) {
  const systemPrompt = instance.system_prompt || "You are Nora, a personal AI assistant."

  let aiResult: Awaited<ReturnType<typeof generateAiResponse>>
  try {
    aiResult = await generateAiResponse([{ role: "system", content: systemPrompt }, ...messages])
  } catch (error) {
    console.error("Nora AI providers exhausted", error)
    return NextResponse.json({ error: "سرویس هوش مصنوعی پاسخ نداد." }, { status: 502 })
  }

  const { content, model, provider } = aiResult
  const { error: assistantMessageError } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "assistant", content, metadata: { model, provider } })
  if (assistantMessageError) return NextResponse.json({ error: "پاسخ تولید شد اما ذخیره تاریخچه گفتگو کامل نشد." }, { status: 500 })

  await supabase
    .from("nora_conversations")
    .update({ title: conversationTitle, updated_at: new Date().toISOString() })
    .eq("id", conversationId)

  return NextResponse.json({ content, conversationId })
}
