import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireOwner } from "@/lib/authz"
import { DEFAULT_USER_PROFILE, normalizeUserProfile, type NoraRelationshipState } from "@/lib/nora-core"

export const dynamic = "force-dynamic"

const DEFAULT_RELATIONSHIP: NoraRelationshipState = {
  familiarity: 0,
  trust: 50,
  closeness: 20,
  humor: 60,
  supportiveness: 80,
  conversations: 0,
}

function normalizeRelationship(value: unknown): NoraRelationshipState {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const n = (key: keyof NoraRelationshipState, fallback: number) => {
    const v = Number(raw[key])
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : fallback
  }
  return {
    familiarity: n("familiarity", 0),
    trust: n("trust", 50),
    closeness: n("closeness", 20),
    humor: n("humor", 60),
    supportiveness: n("supportiveness", 80),
    conversations: Math.max(0, Number(raw.conversations) || 0),
    lastInteractionAt: typeof raw.lastInteractionAt === "string" ? raw.lastInteractionAt : undefined,
  }
}

export async function GET() {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
  const noraId = owner.profile?.nora_id
  if (!noraId) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })

  const supabase = await createClient()
  const [userResult, instanceResult, memoryResult, conversationResult] = await Promise.all([
    supabase.from("nora_users").select("profile,name,email").eq("id", owner.authUser.id).eq("nora_id", noraId).maybeSingle(),
    supabase.from("nora_instances").select("id,name,personality,settings,system_prompt,is_active").eq("id", noraId).maybeSingle(),
    supabase.from("nora_memory").select("id", { count: "exact", head: true }).eq("nora_id", noraId).eq("user_id", owner.authUser.id),
    supabase.from("nora_conversations").select("metadata,created_at,updated_at").eq("nora_id", noraId).eq("user_id", owner.authUser.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ])

  if (userResult.error || instanceResult.error) return NextResponse.json({ error: "دریافت مغز نورا ناموفق بود." }, { status: 500 })

  const metadata = conversationResult.data?.metadata
  const relationship = normalizeRelationship(metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>).relationship : null)
  const profile = normalizeUserProfile(userResult.data?.profile ?? DEFAULT_USER_PROFILE)

  return NextResponse.json({
    profile,
    relationship,
    memoryCount: memoryResult.count ?? 0,
    instance: instanceResult.data,
  })
}

export async function PATCH(request: Request) {
  const owner = await requireOwner()
  if (!owner) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
  const noraId = owner.profile?.nora_id
  if (!noraId) return NextResponse.json({ error: "نمونه نورا پیدا نشد." }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 })
  const supabase = await createClient()

  if (body.action === "reset_profile") {
    const { error } = await supabase.from("nora_users").update({ profile: DEFAULT_USER_PROFILE }).eq("id", owner.authUser.id).eq("nora_id", noraId)
    if (error) return NextResponse.json({ error: "بازنشانی پروفایل ناموفق بود." }, { status: 500 })
    return NextResponse.json({ ok: true, profile: DEFAULT_USER_PROFILE })
  }

  if (body.action === "reset_relationship") {
    const latest = await supabase.from("nora_conversations").select("id,metadata").eq("nora_id", noraId).eq("user_id", owner.authUser.id).order("updated_at", { ascending: false }).limit(1).maybeSingle()
    if (latest.error || !latest.data) return NextResponse.json({ error: "گفت‌وگوی نورا پیدا نشد." }, { status: 404 })
    const metadata = latest.data.metadata && typeof latest.data.metadata === "object" ? { ...(latest.data.metadata as Record<string, unknown>) } : {}
    metadata.relationship = DEFAULT_RELATIONSHIP
    const { error } = await supabase.from("nora_conversations").update({ metadata }).eq("id", latest.data.id).eq("nora_id", noraId).eq("user_id", owner.authUser.id)
    if (error) return NextResponse.json({ error: "بازنشانی رابطه ناموفق بود." }, { status: 500 })
    return NextResponse.json({ ok: true, relationship: DEFAULT_RELATIONSHIP })
  }

  if (body.action === "save_profile") {
    const profile = normalizeUserProfile(body.profile)
    const { error } = await supabase.from("nora_users").update({ profile }).eq("id", owner.authUser.id).eq("nora_id", noraId)
    if (error) return NextResponse.json({ error: "ذخیره پروفایل ناموفق بود." }, { status: 500 })
    return NextResponse.json({ ok: true, profile })
  }

  return NextResponse.json({ error: "عملیات نامعتبر است." }, { status: 400 })
}
