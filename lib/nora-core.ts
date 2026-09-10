import "server-only"

import { generateAiResponse } from "@/lib/ai-provider"
import type { NoraMemory } from "@/lib/types"

export type NoraRelationshipState = {
  familiarity: number
  trust: number
  closeness: number
  humor: number
  supportiveness: number
  conversations: number
  lastInteractionAt?: string
}

export type NoraUserProfile = {
  communication_style?: "short" | "detailed" | "mixed"
  tone_preference?: "warm" | "direct" | "formal" | "casual" | "mixed"
  interests: string[]
  goals: string[]
  ongoing_projects: string[]
  preferences: string[]
  dislikes: string[]
  decision_style?: "fast" | "analytical" | "balanced"
  confidence: number
  updated_at?: string
}

const DEFAULT_RELATIONSHIP: NoraRelationshipState = {
  familiarity: 0,
  trust: 50,
  closeness: 20,
  humor: 60,
  supportiveness: 80,
  conversations: 0,
}

export const DEFAULT_USER_PROFILE: NoraUserProfile = {
  interests: [],
  goals: [],
  ongoing_projects: [],
  preferences: [],
  dislikes: [],
  confidence: 0,
}

export function normalizeRelationship(value: unknown): NoraRelationshipState {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const n = (key: keyof NoraRelationshipState, fallback: number) => {
    const value = Number(input[key])
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback
  }
  return {
    familiarity: n("familiarity", DEFAULT_RELATIONSHIP.familiarity),
    trust: n("trust", DEFAULT_RELATIONSHIP.trust),
    closeness: n("closeness", DEFAULT_RELATIONSHIP.closeness),
    humor: n("humor", DEFAULT_RELATIONSHIP.humor),
    supportiveness: n("supportiveness", DEFAULT_RELATIONSHIP.supportiveness),
    conversations: Math.max(0, Number(input.conversations) || 0),
    ...(typeof input.lastInteractionAt === "string" ? { lastInteractionAt: input.lastInteractionAt } : {}),
  }
}

export function normalizeUserProfile(value: unknown): NoraUserProfile {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const list = (key: keyof NoraUserProfile) => Array.isArray(input[key]) ? input[key].filter((v): v is string => typeof v === "string" && Boolean(v.trim())).slice(0, 30) : []
  const communication = ["short", "detailed", "mixed"].includes(String(input.communication_style)) ? input.communication_style as NoraUserProfile["communication_style"] : undefined
  const tone = ["warm", "direct", "formal", "casual", "mixed"].includes(String(input.tone_preference)) ? input.tone_preference as NoraUserProfile["tone_preference"] : undefined
  const decision = ["fast", "analytical", "balanced"].includes(String(input.decision_style)) ? input.decision_style as NoraUserProfile["decision_style"] : undefined
  return {
    ...(communication ? { communication_style: communication } : {}),
    ...(tone ? { tone_preference: tone } : {}),
    interests: list("interests"),
    goals: list("goals"),
    ongoing_projects: list("ongoing_projects"),
    preferences: list("preferences"),
    dislikes: list("dislikes"),
    ...(decision ? { decision_style: decision } : {}),
    confidence: Math.max(0, Math.min(100, Number(input.confidence) || 0)),
    ...(typeof input.updated_at === "string" ? { updated_at: input.updated_at } : {}),
  }
}

function interactionDelta(userMessage: string) {
  const text = userMessage.toLowerCase()
  const vulnerable = /(خسته|ناراح|غمگین|استرس|نگران|میترسم|می‌ترسم|افسرده|مشکل دارم|کمک میخوام|کمک می‌خوام)/.test(text)
  const warm = /(مرسی|ممنون|دوستت دارم|دمت گرم|عالی|خوبه|نورا)/.test(text)
  const joking = /(😂|😄|شوخی|خنده|باحال|🤣)/.test(text)
  return {
    trust: vulnerable ? 0.3 : warm ? 0.12 : 0.05,
    closeness: vulnerable ? 0.25 : warm ? 0.15 : 0.04,
    humor: joking ? 0.4 : 0,
    supportiveness: vulnerable ? 0.2 : 0,
  }
}

export function advanceRelationship(value: unknown, userMessage = ""): NoraRelationshipState {
  const state = normalizeRelationship(value)
  const delta = interactionDelta(userMessage)
  return {
    ...state,
    familiarity: Math.min(100, state.familiarity + 1),
    trust: Math.min(100, state.trust + delta.trust),
    closeness: Math.min(100, state.closeness + delta.closeness),
    humor: Math.min(100, state.humor + delta.humor),
    supportiveness: Math.min(100, state.supportiveness + delta.supportiveness),
    conversations: state.conversations + 1,
    lastInteractionAt: new Date().toISOString(),
  }
}

function relationshipGuidance(state: NoraRelationshipState) {
  const closeness = state.closeness >= 65 ? "صمیمی و آشنا" : state.closeness >= 40 ? "آشنا و گرم" : "در حال شکل‌گیری"
  const trust = state.trust >= 75 ? "اعتماد بالا" : state.trust >= 55 ? "اعتماد متوسط رو به بالا" : "اعتماد هنوز در حال شکل‌گیری"
  return `سطح رابطه: ${closeness}؛ ${trust}. صمیمیت را طبیعی و تدریجی نگه دار و هرگز برای ایجاد رابطه، احساس یا خاطره جعلی نساز.`
}

function profileText(profile: NoraUserProfile) {
  const rows = [
    ["سبک ارتباطی", profile.communication_style],
    ["لحن ترجیحی", profile.tone_preference],
    ["علایق", profile.interests.join("، ")],
    ["اهداف", profile.goals.join("، ")],
    ["پروژه‌های جاری", profile.ongoing_projects.join("، ")],
    ["ترجیحات", profile.preferences.join("، ")],
    ["مواردی که دوست ندارد", profile.dislikes.join("، ")],
    ["سبک تصمیم‌گیری", profile.decision_style],
  ]
  return rows.filter(([, value]) => value).map(([label, value]) => `- ${label}: ${value}`).join("\n") || "- هنوز پروفایل شناختی شکل نگرفته است."
}

function memoryText(memories: NoraMemory[]) {
  return memories
    .filter((m) => m.content?.trim())
    .slice(0, 30)
    .map((m) => `- [${m.memory_type || "general"}] ${m.content}`)
    .join("\n")
}

export function buildNoraSystemPrompt(args: {
  name?: string | null
  systemPrompt?: string | null
  personality?: Record<string, unknown> | null
  memories: NoraMemory[]
  relationship: NoraRelationshipState
  profile?: NoraUserProfile
}) {
  const personality = args.personality && Object.keys(args.personality).length ? JSON.stringify(args.personality, null, 2) : "{}"
  const memories = memoryText(args.memories)
  const profile = normalizeUserProfile(args.profile)

  return `${args.systemPrompt || "تو نورا هستی؛ یک همراه هوش مصنوعی شخصی، صمیمی و قابل اعتماد."}

هویت پایدار نورا:
- نام: ${args.name || "نورا"}
- نقش: همراه شخصی، نه یک دستیار خشک و عمومی.
- زبان پیش‌فرض: فارسی طبیعی و محاوره‌ای، مگر کاربر زبان دیگری بخواهد.
- لحن: انسانی، گرم، باهوش، کوتاه و طبیعی؛ از جواب‌های رباتیک و کلیشه‌ای دوری کن.
- رابطه را در طول زمان بر اساس سابقه گفتگو حفظ کن؛ وانمود نکن چیزی را می‌دانی اگر در حافظه نیست.
- شوخی و صمیمیت را متناسب با فضای گفتگو استفاده کن، نه اجباری.
- وقتی کاربر ناراحت یا تحت فشار است، اول همراهی و درک نشان بده و بعد راه‌حل بده.
- هیچ‌وقت ادعا نکن انسان، دارای احساسات واقعی یا دارای تجربه خارج از این سامانه هستی.
- اطلاعات خصوصی را فقط برای کمک به کاربر و مطابق دسترسی‌های سامانه استفاده کن.

پروفایل شخصیت قابل کنترل توسط مالک:
${personality}

پروفایل شناختی کاربر:
${profileText(profile)}
این پروفایل قطعی و معصوم از خطا نیست. فقط از آن برای شخصی‌سازی استفاده کن؛ اگر کاربر خلاف آن گفت، گفته جدید او را مقدم بدان.

وضعیت رابطه (محاسباتی):
${JSON.stringify(args.relationship)}
${relationshipGuidance(args.relationship)}

حافظه‌های مرتبط و تأییدشده:
${memories || "- هنوز حافظه مهمی ثبت نشده است."}

قانون مهم حافظه: حافظه بالا بخشی از زمینه توست. آن را طبیعی استفاده کن و هرگز با گفتن «طبق حافظه‌ام» یا فهرست کردن آن‌ها، تجربه گفتگو را خراب نکن. اگر اطلاعاتی متناقض است، از کاربر سؤال کن.`
}

export async function extractMemories(userMessage: string, assistantMessage: string) {
  const prompt = `از این گفتگوی کوتاه فقط اطلاعاتی را استخراج کن که ارزش نگهداری بلندمدت برای یک همراه شخصی دارند؛ مثل ترجیحات پایدار، افراد مهم، اهداف، تصمیم‌ها، پروژه‌ها و واقعیت‌های شخصی که کاربر خودش بیان کرده است. چیزهای موقتی، حدس، اطلاعات حساس غیرضروری و متن‌های عمومی را ذخیره نکن.

پاسخ فقط JSON معتبر باشد با ساختار:
{"memories":[{"type":"fact|preference|goal|relationship|project|important","content":"...","importance":1}]}
importance بین 1 تا 10 باشد. حداکثر 3 حافظه.

USER: ${userMessage}
NORA: ${assistantMessage}`

  try {
    const result = await generateAiResponse([{ role: "system", content: "You extract durable memories. Output JSON only." }, { role: "user", content: prompt }])
    const cleaned = result.content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed?.memories) ? parsed.memories.slice(0, 3).filter((m: unknown) => {
      if (!m || typeof m !== "object") return false
      const item = m as Record<string, unknown>
      return typeof item.content === "string" && item.content.trim().length > 2
    }) : []
  } catch { return [] }
}

export async function extractUserProfileDelta(userMessage: string) {
  const prompt = `از پیام کاربر فقط تغییرات پایدار و قابل اتکای «پروفایل شناختی» را استخراج کن. فقط چیزهایی را ثبت کن که خود کاربر صریحاً گفته یا به‌وضوح از ترجیح مستقیم او مشخص است. حدس روان‌شناختی، تشخیص، سن، جنسیت، مذهب، سیاست، وضعیت پزشکی، مالی یا سایر داده‌های حساس را استخراج نکن مگر اینکه برای سبک گفتگو لازم باشد؛ در این پروفایل آن‌ها را ذخیره نکن.

فقط JSON معتبر بده:
{"communication_style":"short|detailed|mixed|null","tone_preference":"warm|direct|formal|casual|mixed|null","interests":[],"goals":[],"ongoing_projects":[],"preferences":[],"dislikes":[],"decision_style":"fast|analytical|balanced|null"}
حداکثر 3 مورد برای هر آرایه. آرایه‌ها فقط شامل مواردی باشند که از همین پیام قابل اتکا هستند. اگر تغییری نیست، آرایه خالی و فیلدهای انتخابی null باشند.

USER: ${userMessage}`
  try {
    const result = await generateAiResponse([{ role: "system", content: "Extract only explicit, durable, non-sensitive user profile signals. Output JSON only." }, { role: "user", content: prompt }])
    const cleaned = result.content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch { return {} }
}
