import { Brain } from "lucide-react"
import { Card, CardContent, EmptyState, ErrorState } from "@/components/ui"
import { formatDate, memoryContent, memoryTitle } from "@/lib/format"
import type { NoraMemory } from "@/lib/types"

export function MemoriesPanel({ memories, error }: { memories: NoraMemory[]; error: string | null }) {
  return (
    <section aria-labelledby="memories-heading" className="flex flex-col gap-4">
      <h2 id="memories-heading" className="text-sm font-semibold text-muted-foreground">
        حافظه‌ی نورا
      </h2>

      {error ? <ErrorState message={`دریافت حافظه ناموفق بود: ${error}`} /> : null}

      {!error && memories.length === 0 ? (
        <EmptyState
          icon={<Brain className="h-6 w-6" aria-hidden="true" />}
          title="حافظه‌ای ذخیره نشده است"
          description="نکاتی که نورا درباره‌ی شما به خاطر می‌سپارد اینجا ظاهر می‌شوند."
        />
      ) : null}

      {memories.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {memories.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-balance">{memoryTitle(m)}</span>
                  {m.category ? (
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {m.category}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {memoryContent(m) || "—"}
                </p>
                <span className="text-[10px] text-muted-foreground">{formatDate(m.created_at)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  )
}
