import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/authz"
import { getConversations, getInstances, getMemories, getMessages } from "@/lib/nora"
import { AppShell } from "@/components/app-shell"
import { StatusPanel } from "@/components/dashboard/status-panel"
import { ConversationsView } from "@/components/dashboard/conversations-view"
import { MemoriesPanel } from "@/components/dashboard/memories-panel"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect("/auth/login?next=/dashboard")

  const [instances, conversations, messages, memories] = await Promise.all([
    getInstances(),
    getConversations(),
    getMessages(),
    getMemories(),
  ])

  return (
    <AppShell email={ctx.authUser.email} role={ctx.profile?.role} isOwner={ctx.isOwner} active="dashboard">
      <div className="flex flex-col gap-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">داشبورد</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            نمای کلی وضعیت نورا، گفتگوها و حافظه‌ی شما.
          </p>
        </div>

        <StatusPanel
          instances={instances.data}
          error={instances.error}
          conversationCount={conversations.data.length}
          memoryCount={memories.data.length}
        />

        <ConversationsView
          conversations={conversations.data}
          messages={messages.data}
          conversationsError={conversations.error}
          messagesError={messages.error}
        />

        <MemoriesPanel memories={memories.data} error={memories.error} />
      </div>
    </AppShell>
  )
}
