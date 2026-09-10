import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOwner } from "@/lib/authz"

export const dynamic = "force-dynamic"

export async function GET() {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("nora_instances")
    .select("id,name,system_prompt,personality,settings,is_active")
    .eq("id", owner.profile?.nora_id || "")
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })
  return NextResponse.json({ instance: data })
}

export async function PATCH(request: Request) {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })

  const body = await request.json().catch(() => null)
  const allowed = new Set(["name", "system_prompt", "personality", "settings", "is_active"])
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body || {}, key)) update[key] = body[key]
  }
  if (typeof update.name === "string") update.name = update.name.trim().slice(0, 80)
  if (typeof update.system_prompt === "string") update.system_prompt = update.system_prompt.trim().slice(0, 12000)
  if (update.personality && typeof update.personality !== "object") return NextResponse.json({ error: "شخصیت نامعتبر است." }, { status: 400 })
  if (update.settings && typeof update.settings !== "object") return NextResponse.json({ error: "تنظیمات نامعتبر است." }, { status: 400 })
  if (typeof update.is_active !== "boolean") delete update.is_active
  if (!Object.keys(update).length) return NextResponse.json({ error: "تغییری ارسال نشده است." }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("nora_instances")
    .update(update)
    .eq("id", owner.profile?.nora_id || "")
    .select("id,name,system_prompt,personality,settings,is_active")
    .single()

  if (error || !data) {
    console.error("Nora owner control update failed", error)
    return NextResponse.json({ error: "ذخیره تنظیمات نورا ناموفق بود." }, { status: 500 })
  }
  return NextResponse.json({ instance: data })
}
