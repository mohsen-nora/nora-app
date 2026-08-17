import { Users, Terminal, Activity, Server } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, EmptyState, ErrorState, Badge } from "@/components/ui"
import {
  activityAction,
  activityDetail,
  commandEnabled,
  commandName,
  formatDateTime,
  instanceName,
  roleLabel,
  statusVisual,
  userLabel,
} from "@/lib/format"
import type { NoraActivityLog, NoraCommand, NoraInstance, NoraUser } from "@/lib/types"

export function UsersSection({ users, error }: { users: NoraUser[]; error: string | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Users className="h-4 w-4 text-accent" aria-hidden="true" />
        <CardTitle>کاربران</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <ErrorState message={error} /> : null}
        {!error && users.length === 0 ? (
          <EmptyState title="کاربری یافت نشد" />
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{userLabel(u)}</span>
                  {u.email ? (
                    <span dir="ltr" className="truncate font-mono text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  ) : null}
                </div>
                <Badge className="shrink-0 text-muted-foreground">{roleLabel(u.role)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function InstancesSection({ instances, error }: { instances: NoraInstance[]; error: string | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Server className="h-4 w-4 text-accent" aria-hidden="true" />
        <CardTitle>نمونه‌های نورا</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <ErrorState message={error} /> : null}
        {!error && instances.length === 0 ? (
          <EmptyState title="نمونه‌ای ثبت نشده است" />
        ) : (
          <ul className="divide-y divide-border">
            {instances.map((i) => {
              const s = statusVisual(i.status)
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{instanceName(i)}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(i.created_at)}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs ${s.text}`}>
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function CommandsSection({ commands, error }: { commands: NoraCommand[]; error: string | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Terminal className="h-4 w-4 text-accent" aria-hidden="true" />
        <CardTitle>دستورها</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <ErrorState message={error} /> : null}
        {!error && commands.length === 0 ? (
          <EmptyState title="دستوری تعریف نشده است" />
        ) : (
          <ul className="divide-y divide-border">
            {commands.map((c) => {
              const enabled = commandEnabled(c)
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-mono text-sm font-medium">{commandName(c)}</span>
                    {c.description ? (
                      <span className="truncate text-xs text-muted-foreground">{c.description}</span>
                    ) : null}
                  </div>
                  <Badge
                    className={
                      enabled
                        ? "shrink-0 border-emerald-400/30 text-emerald-300"
                        : "shrink-0 border-zinc-500/30 text-zinc-400"
                    }
                  >
                    {enabled ? "فعال" : "غیرفعال"}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function ActivitySection({ logs, error }: { logs: NoraActivityLog[]; error: string | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
        <CardTitle>گزارش فعالیت‌ها</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <ErrorState message={error} /> : null}
        {!error && logs.length === 0 ? (
          <EmptyState title="فعالیتی ثبت نشده است" />
        ) : (
          <ol className="relative flex flex-col gap-4 border-r border-border pr-4">
            {logs.map((l) => (
              <li key={l.id} className="relative">
                <span
                  className="absolute -right-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">{activityAction(l)}</p>
                {activityDetail(l) ? (
                  <p className="text-xs leading-relaxed text-muted-foreground text-pretty">{activityDetail(l)}</p>
                ) : null}
                <span className="text-[10px] text-muted-foreground">{formatDateTime(l.created_at)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
