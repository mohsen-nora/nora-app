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

export async function streamAiResponse(messages: ChatMessage[], onChunk: (text: string) => void) {
  const providers = getAiProvidersForStreaming()
  if (!providers.length) throw new Error("AI_PROVIDER_NOT_CONFIGURED")
  let lastError: unknown = null

  for (const provider of providers) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let emitted = false
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 35000)
        let response: Response
        try {
          response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${provider.apiKey}`, accept: "text/event-stream" },
            body: JSON.stringify({
              model: provider.model,
              messages,
              stream: true,
              max_tokens: 250,
            }),
            cache: "no-store",
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timeout)
        }

        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => null)
          lastError = new Error(`${provider.name} provider returned ${response.status}`)
          console.error("Nora AI streaming provider error", provider.name, response.status, data)
          if (attempt < 2) continue
          break
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""

        const consume = (text: string) => {
          buffer += text
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line.startsWith("data:")) continue
            const payload = line.slice(5).trim()
            if (payload === "[DONE]") continue
            try {
              const data = JSON.parse(payload)
              const delta = data?.choices?.[0]?.delta?.content
              if (typeof delta === "string" && delta) {
                emitted = true
                fullContent += delta
                onChunk(delta)
              }
            } catch {
              // Ignore incomplete/non-JSON SSE lines.
            }
          }
        }

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          consume(decoder.decode(value, { stream: true }))
        }
        consume(decoder.decode())

        if (!fullContent.trim()) {
          lastError = new Error(`${provider.name} returned an empty streaming response`)
          if (attempt < 2 && !emitted) continue
          break
        }
        return { content: fullContent.trim(), model: provider.model, provider: provider.name }
      } catch (error) {
        lastError = error
        console.error("Nora AI streaming request failed", provider.name, `attempt=${attempt}`, error)
        // Retry transient provider/network failures only when no text reached the user.
        // Never retry after partial output because that would duplicate the answer in the UI.
        if (attempt < 2 && !emitted) continue
        break
      }
    }
  }

  throw lastError || new Error("AI_PROVIDER_FAILED")
}

export async function generateAiResponse(messages: ChatMessage[]) {
  const result = await streamAiResponse(messages, () => {})
  return result
}
