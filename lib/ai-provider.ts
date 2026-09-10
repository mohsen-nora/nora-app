type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

type Provider = {
  name: string
  apiKey: string
  baseUrl: string
  model: string
}

export function getAiProvidersForStreaming(): Provider[] {
  const providers: Provider[] = []
  const primaryKey = process.env.AI_PRIMARY_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY
  const primaryBaseUrl = process.env.AI_PRIMARY_BASE_URL || process.env.OPENAI_BASE_URL || "https://1xai.ir/v1"
  const primaryModel = process.env.AI_PRIMARY_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini"
  if (primaryKey) providers.push({ name: "primary", apiKey: primaryKey, baseUrl: primaryBaseUrl, model: primaryModel })

  const fallbackKey = process.env.AI_FALLBACK_API_KEY
  const fallbackBaseUrl = process.env.AI_FALLBACK_BASE_URL
  const fallbackModel = process.env.AI_FALLBACK_MODEL || primaryModel
  if (fallbackKey && fallbackBaseUrl) providers.push({ name: "fallback", apiKey: fallbackKey, baseUrl: fallbackBaseUrl, model: fallbackModel })
  return providers
}

export async function generateAiResponse(messages: ChatMessage[]) {
  const providers = getAiProvidersForStreaming()
  if (!providers.length) throw new Error("AI_PROVIDER_NOT_CONFIGURED")
  let lastError: unknown = null

  for (const provider of providers) {
    try {
      const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({ model: provider.model, messages }),
        cache: "no-store",
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        lastError = new Error(`${provider.name} provider returned ${response.status}`)
        console.error("Nora AI provider error", provider.name, response.status, data)
        continue
      }
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== "string" || !content.trim()) {
        lastError = new Error(`${provider.name} returned an empty response`)
        continue
      }
      return { content: content.trim(), model: provider.model, provider: provider.name }
    } catch (error) {
      lastError = error
      console.error("Nora AI provider request failed", provider.name, error)
    }
  }
  throw lastError || new Error("AI_PROVIDER_FAILED")
}
