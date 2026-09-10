import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/authz"
import { ChatView } from "@/components/chat/chat-view"

export const dynamic = "force-dynamic"

export default async function ChatPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect("/auth/login?next=/chat")

  return (
    <main className="min-h-svh bg-background">
      <ChatView email={ctx.authUser.email} isOwner={ctx.isOwner} />
    </main>
  )
}
