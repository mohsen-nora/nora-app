import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/authz"
import { createClient } from "@/lib/supabase/server"
import { generateAiResponse } from "@/lib/ai-provider"

export const dynamic = "force-dynamic"

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
      return (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim()
    })
    .slice(-20)
    .map((m: Record<string, unknown>) => ({ role: m.role as "user" | "assistant", content: String(m.content).trim().slice(0, 12000) }))

  const lastUser = [...cleanMessages].reverse().find((m) => m.role === "user")
  if (!lastUser) return NextResponse.json({ error: "پیام معتبری ارسال نشده است." }, { status: 400 })

  const supabase = await createClient()
  const { data: instance, error: instanceError } = await supabase
    .from("nora_instances")
    .select("id,name,system_prompt,is_active")
    .eq("id", ctx.profile.nora_id)
    .maybeSingle()
  if (instanceError || !instance) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })
  if (instance.is_active === false) return NextResponse.json({ error: "نورا در حال حاضر غیرفعال است." }, { status: 503 })

  const systemPrompt = instance.system_prompt || "You are Nora, a personal AI assistant."
  let aiResult: Awaited<ReturnType<typeof generateAiResponse>>
  try {
    aiResult = await generateAiResponse([{ role: "system", content: systemPrompt }, ...cleanMessages])
  } catch (error) {
    console.error("Nora AI providers exhausted", error)
    return NextResponse.json({ error: "سرویس هوش مصنوعی پاسخ نداد." }, { status: 502 })
  }

  const { content, model, provider } = aiResult
  let conversationId: string | null = null
  const { data: existing } = await supabase
    .from("nora_conversations")
    .select("id")
    .eq("nora_id", instance.id)
    .eq("user_id", ctx.authUser.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    conversationId = existing.id
    await supabase.from("nora_conversations").update({ title: lastUser.content.slice(0, 80), updated_at: new Date().toISOString() }).eq("id", conversationId)
  } else {
    const { data: created, error } = await supabase
      .from("nora_conversations")
      .insert({ nora_id: instance.id, user_id: ctx.authUser.id, title: lastUser.content.slice(0, 80), metadata: {} })
      .select("id")
      .single()
    if (error) return NextResponse.json({ error: "ذخیره گفتگو ناموفق بود." }, { status: 500 })
    conversationId = created.id
  }

  const { error: userMessageError } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "user", content: lastUser.content, metadata: {} })
  const { error: assistantMessageError } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "assistant", content, metadata: { model, provider } })
  if (userMessageError || assistantMessageError) return NextResponse.json({ error: "پاسخ تولید شد اما ذخیره تاریخچه گفتگو کامل نشد." }, { status: 500 })

  return NextResponse.json({ content, conversationId })
}
