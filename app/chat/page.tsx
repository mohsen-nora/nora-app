import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/authz"
import { ChatView } from "@/components/chat/chat-view"
import { AppShell } from "@/components/app-shell"

export const dynamic = "force-dynamic"

export default async function ChatPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect("/auth/login?next=/chat")

  return (
    <AppShell email={ctx.authUser.email} role={ctx.profile?.role} isOwner={ctx.isOwner} active="chat">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">گفتگو با نورا</h1>
          <p className="mt-1 text-sm text-muted-foreground">گفتگوی مستقیم با دستیار شخصی شما.</p>
        </div>
        <ChatView />
      </div>
    </AppShell>
  )
}
