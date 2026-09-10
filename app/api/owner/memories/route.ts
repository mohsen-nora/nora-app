import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOwner } from "@/lib/authz"

export const dynamic = "force-dynamic"

const TYPES = new Set(["fact", "preference", "goal", "relationship", "context", "project", "important"])

export async function GET() {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
  const noraId = owner.profile?.nora_id
  if (!noraId) return NextResponse.json({ memories: [] })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("nora_memory")
    .select("id,user_id,memory_type,content,importance,metadata,created_at,updated_at")
    .eq("nora_id", noraId)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: "دریافت حافظه‌ها ناموفق بود." }, { status: 500 })
  return NextResponse.json({ memories: data || [] })
}

export async function PATCH(request: Request) {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
  const noraId = owner.profile?.nora_id
  if (!noraId) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "شناسه حافظه الزامی است." }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.content === "string") {
    const content = body.content.trim().slice(0, 2000)
    if (!content) return NextResponse.json({ error: "متن حافظه نمی‌تواند خالی باشد." }, { status: 400 })
    update.content = content
  }
  if (typeof body.memory_type === "string") {
    if (!TYPES.has(body.memory_type)) return NextResponse.json({ error: "نوع حافظه نامعتبر است." }, { status: 400 })
    update.memory_type = body.memory_type
  }
  if (body.importance !== undefined) {
    const importance = Number(body.importance)
    if (!Number.isInteger(importance) || importance < 1 || importance > 10) return NextResponse.json({ error: "اهمیت باید بین ۱ تا ۱۰ باشد." }, { status: 400 })
    update.importance = importance
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "تغییری ارسال نشده است." }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("nora_memory")
    .update(update)
    .eq("id", body.id)
    .eq("nora_id", noraId)
    .select("id,user_id,memory_type,content,importance,metadata,created_at,updated_at")
    .single()

  if (error || !data) return NextResponse.json({ error: "ویرایش حافظه ناموفق بود." }, { status: 500 })
  return NextResponse.json({ memory: data })
}

export async function DELETE(request: Request) {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
  const noraId = owner.profile?.nora_id
  if (!noraId) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "شناسه حافظه الزامی است." }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase
    .from("nora_memory")
    .delete()
    .eq("id", body.id)
    .eq("nora_id", noraId)

  if (error) return NextResponse.json({ error: "حذف حافظه ناموفق بود." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
