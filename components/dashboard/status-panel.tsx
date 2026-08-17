import { Cpu, MessageSquare, Brain } from "lucide-react"
import { Card, CardContent, EmptyState, ErrorState } from "@/components/ui"
import { statusVisual, instanceName, formatDateTime, toFaDigits } from "@/lib/format"
import type { NoraInstance } from "@/lib/types"

export function StatusPanel({
  instances,
  error,
  conversationCount,
  memoryCount,
}: {
  instances: NoraInstance[]
  error: string | null
  conversationCount: number
  memoryCount: number
}) {
  const primary = instances[0]
  const primaryStatus = statusVisual(primary?.status)

  return (
    <section aria-labelledby="status-heading" className="flex flex-col gap-4">
      <h2 id="status-heading" className="text-sm font-semibold text-muted-foreground">
        وضعیت نورا
      </h2>

      {error ? <ErrorState message={`دریافت وضعیت ناموفق بود: ${error}`} /> : null}

      {!error && instances.length === 0 ? (
        <EmptyState
          icon={<Cpu className="h-6 w-6" aria-hidden="true" />}
          title="هیچ نمونه‌ای از نورا در دسترس نیست"
          description="هنوز نمونه‌ای برای حساب شما پیکربندی نشده است."
        />
      ) : null}

      {primary ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold text-balance">{instanceName(primary)}</span>
                {primary.version ? (
                  <span className="font-mono text-xs text-muted-foreground">نسخه {primary.version}</span>
                ) : null}
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-xs font-medium ring-1 ${primaryStatus.ring} ${primaryStatus.text}`}
              >
                <span className={`h-2 w-2 rounded-full ${primaryStatus.dot}`} aria-hidden="true" />
                {primaryStatus.label}
              </span>
            </div>

            {primary.description ? (
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{primary.description}</p>
            ) : null}

            {primary.last_active_at ? (
              <p className="text-xs text-muted-foreground">
                آخرین فعالیت: {formatDateTime(primary.last_active_at)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard icon={<Cpu className="h-4 w-4" aria-hidden="true" />} label="نمونه‌ها" value={instances.length} />
        <StatCard
          icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          label="گفتگوها"
          value={conversationCount}
        />
        <StatCard icon={<Brain className="h-4 w-4" aria-hidden="true" />} label="خاطرات" value={memoryCount} />
      </div>
    </section>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary-foreground">
          <span className="text-accent">{icon}</span>
        </span>
        <span className="text-2xl font-bold tabular-nums">{toFaDigits(value)}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  )
}
