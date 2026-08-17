"use client"

import { useMemo, useState } from "react"
import { MessageSquare, ArrowRight } from "lucide-react"
import { Card, EmptyState, ErrorState } from "@/components/ui"
import { conversationTitle, formatDateTime, messageContent, messageRole, toFaDigits } from "@/lib/format"
import type { NoraConversation, NoraMessage } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ConversationsView({
  conversations,
  messages,
  conversationsError,
  messagesError,
}: {
  conversations: NoraConversation[]
  messages: NoraMessage[]
  conversationsError: string | null
  messagesError: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null)

  const messagesByConversation = useMemo(() => {
    const map = new Map<string, NoraMessage[]>()
    for (const m of messages) {
      const key = m.conversation_id ?? "__none__"
      const arr = map.get(key) ?? []
      arr.push(m)
      map.set(key, arr)
    }
    return map
  }, [messages])

  const selected = conversations.find((c) => c.id === selectedId) ?? null
  const selectedMessages = selectedId ? (messagesByConversation.get(selectedId) ?? []) : []

  return (
    <section aria-labelledby="conversations-heading" className="flex flex-col gap-4">
      <h2 id="conversations-heading" className="text-sm font-semibold text-muted-foreground">
        گفتگوها
      </h2>

      {conversationsError ? <ErrorState message={`دریافت گفتگوها ناموفق بود: ${conversationsError}`} /> : null}

      {!conversationsError && conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" aria-hidden="true" />}
          title="هنوز گفتگویی وجود ندارد"
          description="پس از اولین گفتگو با نورا، تاریخچه اینجا نمایش داده می‌شود."
        />
      ) : null}

      {conversations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
          {/* Conversation list */}
          <Card className="overflow-hidden">
            <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
              {conversations.map((c) => {
                const count = messagesByConversation.get(c.id)?.length ?? 0
                const isActive = c.id === selectedId
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition",
                        isActive ? "bg-primary/10" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{conversationTitle(c)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(c.last_message_at ?? c.updated_at ?? c.created_at)}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                        {toFaDigits(count)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* Message thread */}
          <Card className="flex min-h-[20rem] flex-col overflow-hidden">
            {messagesError ? (
              <div className="p-4">
                <ErrorState message={`دریافت پیام‌ها ناموفق بود: ${messagesError}`} />
              </div>
            ) : selected ? (
              <>
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold">{conversationTitle(selected)}</p>
                </div>
                <div className="flex max-h-[24rem] flex-1 flex-col gap-3 overflow-y-auto p-4">
                  {selectedMessages.length === 0 ? (
                    <p className="m-auto text-sm text-muted-foreground">پیامی در این گفتگو ثبت نشده است.</p>
                  ) : (
                    selectedMessages.map((m) => <MessageBubble key={m.id} message={m} />)
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                یک گفتگو را انتخاب کنید
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </section>
  )
}

function MessageBubble({ message }: { message: NoraMessage }) {
  const role = messageRole(message)
  const isUser = role === "user"
  const isSystem = role === "system"

  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-start" : "items-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed text-pretty",
          isUser
            ? "bg-muted text-foreground"
            : isSystem
              ? "border border-border bg-background/40 text-muted-foreground"
              : "bg-primary/20 text-foreground ring-1 ring-primary/25",
        )}
      >
        {messageContent(message) || <span className="text-muted-foreground">—</span>}
      </div>
      <span className="px-1 text-[10px] text-muted-foreground">
        {isUser ? "شما" : isSystem ? "سیستم" : "نورا"} · {formatDateTime(message.created_at)}
      </span>
    </div>
  )
}
