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
}

const DEFAULT_RELATIONSHIP: NoraRelationshipState = {
  familiarity: 0,
  trust: 50,
  closeness: 20,
  humor: 60,
  supportiveness: 80,
  conversations: 0,
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
  }
}

export function advanceRelationship(value: unknown): NoraRelationshipState {
  const state = normalizeRelationship(value)
  return {
    ...state,
    familiarity: Math.min(100, state.familiarity + 1),
    trust: Math.min(100, state.trust + 0.15),
    closeness: Math.min(100, state.closeness + 0.1),
    conversations: state.conversations + 1,
  }
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
}) {
  const personality = args.personality && Object.keys(args.personality).length
    ? JSON.stringify(args.personality, null, 2)
    : "{}"
  const memories = memoryText(args.memories)

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

وضعیت رابطه (محاسباتی):
${JSON.stringify(args.relationship)}

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
    const result = await generateAiResponse([
      { role: "system", content: "You extract durable memories. Output JSON only." },
      { role: "user", content: prompt },
    ])
    const cleaned = result.content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed?.memories)
      ? parsed.memories.slice(0, 3).filter((m: unknown) => {
          if (!m || typeof m !== "object") return false
          const item = m as Record<string, unknown>
          return typeof item.content === "string" && item.content.trim().length > 2
        })
      : []
  } catch {
    return []
  }
}
