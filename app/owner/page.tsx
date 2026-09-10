import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { getSessionContext, requireOwner } from "@/lib/authz"
import { getActivityLogs, getAllUsers, getCommands, getInstances } from "@/lib/nora"
import { AppShell } from "@/components/app-shell"
import { ActivitySection, CommandsSection, InstancesSection, UsersSection } from "@/components/owner/sections"
import { NoraControl } from "@/components/owner/nora-control"
import { MemoryManager } from "@/components/owner/memory-manager"
import { NoraBrain } from "@/components/owner/nora-brain"

export const dynamic = "force-dynamic"

export default async function OwnerPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect("/auth/login?next=/owner")

  const owner = await requireOwner()

  if (!owner) {
    return (
      <AppShell email={ctx.authUser.email} role={ctx.profile?.role} isOwner={false} active="owner">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card/60 px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300"><ShieldAlert className="h-6 w-6" aria-hidden="true" /></div>
          <h1 className="text-lg font-semibold text-balance">دسترسی غیرمجاز</h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">این بخش تنها برای مالک نورا در دسترس است. حساب شما مجوز لازم را ندارد.</p>
          <Link href="/dashboard" className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">بازگشت به داشبورد</Link>
        </div>
      </AppShell>
    )
  }

  const [users, instances, commands, logs] = await Promise.all([getAllUsers(), getInstances(), getCommands(), getActivityLogs()])
  const ownedInstance = instances.data.find((instance) => instance.id === owner.profile?.nora_id) || instances.data[0] || null

  return (
    <AppShell email={owner.authUser.email} role={owner.profile?.role} isOwner active="owner">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-accent"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span><div><h1 className="text-2xl font-bold tracking-tight text-balance">پنل مالک</h1><p className="mt-0.5 text-sm text-muted-foreground text-pretty">مدیریت مستقیم نورا، کاربران، حافظه و فعالیت‌ها.</p></div></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <NoraControl initial={ownedInstance} />
          <NoraBrain />
          <MemoryManager />
          <UsersSection users={users.data} error={users.error} />
          <InstancesSection instances={instances.data} error={instances.error} />
          <CommandsSection commands={commands.data} error={commands.error} />
          <ActivitySection logs={logs.data} error={logs.error} />
        </div>
      </div>
    </AppShell>
  )
}
