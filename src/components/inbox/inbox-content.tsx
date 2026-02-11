"use client"

import { useState, useEffect, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Header } from "@/components/layout/header"
import { ConversationThread } from "@/components/inbox/conversation-thread"

interface Conversation {
  id: string
  subject: string | null
  lastMessageAt: string | null
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
  messages: {
    id: string
    body: string
    direction: string
    createdAt: string
  }[]
  _count?: {
    messages: number
  }
}

interface InboxContentProps {
  workspaceId: string
  workspaceSlug: string
}

export function InboxContent({ workspaceId, workspaceSlug }: InboxContentProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/conversations`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.customer.name.toLowerCase().includes(q) ||
      c.customer.email?.toLowerCase().includes(q) ||
      c.customer.phone?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q)
    )
  })

  const selectedConversation = conversations.find((c) => c.id === selectedId)

  return (
    <div className="-m-6 flex h-[calc(100vh)] flex-col">
      <div className="border-b px-6 py-4">
        <Header title="Inbox" description="Conversations with your customers" />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Conversation list */}
        <div
          className={cn(
            "flex w-full flex-col border-r md:w-80 md:shrink-0",
            selectedId && "hidden md:flex"
          )}
        >
          <div className="border-b p-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">
                No conversations found
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((conversation) => {
                  const lastMessage = conversation.messages[0]
                  const displayName =
                    conversation.customer.name ||
                    conversation.customer.email ||
                    conversation.customer.phone ||
                    "Unknown"

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-accent",
                        selectedId === conversation.id && "bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {displayName}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          {conversation.lastMessageAt && (
                            <span className="text-muted-foreground text-xs">
                              {formatDistanceToNow(
                                new Date(conversation.lastMessageAt),
                                { addSuffix: true }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {conversation.subject && (
                        <span className="text-muted-foreground truncate text-xs font-medium">
                          {conversation.subject}
                        </span>
                      )}
                      {lastMessage && (
                        <span className="text-muted-foreground line-clamp-1 text-xs">
                          {lastMessage.body}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Conversation thread */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            !selectedId && "hidden md:flex"
          )}
        >
          {selectedId ? (
            <>
              <div className="border-b px-4 py-2 md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              </div>
              <ConversationThread
                workspaceId={workspaceId}
                conversationId={selectedId}
                onMessageSent={fetchConversations}
              />
            </>
          ) : (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
