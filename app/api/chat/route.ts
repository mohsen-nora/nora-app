import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/authz"
import { createClient } from "@/lib/supabase/server"

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

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY
  if (!apiKey) return NextResponse.json({ error: "کلید سرویس هوش مصنوعی روی سرور تنظیم نشده است." }, { status: 503 })

  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  const model = process.env.OPENAI_MODEL || "gpt-5-mini"
  const systemPrompt = instance.system_prompt || "You are Nora, a personal AI assistant."

  const aiResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...cleanMessages], temperature: 0.7 }),
  })

  const aiData = await aiResponse.json().catch(() => null)
  if (!aiResponse.ok) {
    console.error("Nora AI provider error", aiResponse.status, aiData)
    return NextResponse.json({ error: "سرویس هوش مصنوعی پاسخ نداد." }, { status: 502 })
  }

  const content = aiData?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) return NextResponse.json({ error: "پاسخ خالی از سرویس هوش مصنوعی دریافت شد." }, { status: 502 })

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
  const { error: assistantMessageError } = await supabase.from("nora_messages").insert({ conversation_id: conversationId, role: "assistant", content: content.trim(), metadata: { model } })
  if (userMessageError || assistantMessageError) return NextResponse.json({ error: "پاسخ تولید شد اما ذخیره تاریخچه گفتگو کامل نشد." }, { status: 500 })

  return NextResponse.json({ content: content.trim(), conversationId })
}
