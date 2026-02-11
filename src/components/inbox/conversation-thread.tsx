"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { format } from "date-fns"
import { Send, Mail, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  channel: "EMAIL" | "SMS"
  direction: "INBOUND" | "OUTBOUND"
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "RECEIVED"
  fromAddress: string | null
  toAddress: string | null
  subject: string | null
  body: string
  sentAt: string | null
  receivedAt: string | null
  createdAt: string
}

interface ConversationDetail {
  id: string
  subject: string | null
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
  }
  messages: Message[]
}

interface ConversationThreadProps {
  workspaceId: string
  conversationId: string
  onMessageSent?: () => void
}

const statusVariant = (status: Message["status"]) => {
  switch (status) {
    case "DELIVERED":
      return "default"
    case "SENT":
      return "secondary"
    case "FAILED":
      return "destructive"
    default:
      return "outline"
  }
}

export function ConversationThread({
  workspaceId,
  conversationId,
  onMessageSent,
}: ConversationThreadProps) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/conversations/${conversationId}`
      )
      if (res.ok) {
        const data = await res.json()
        setConversation(data)
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, conversationId])

  const syncGmailReplies = useCallback(async () => {
    try {
      await fetch(
        `/api/workspaces/${workspaceId}/conversations/${conversationId}/sync`,
        { method: "POST" }
      )
      await fetchConversation()
    } catch {
      // sync is best-effort
    }
  }, [workspaceId, conversationId, fetchConversation])

  useEffect(() => {
    setLoading(true)
    setConversation(null)
    fetchConversation().then(() => syncGmailReplies())
  }, [fetchConversation, syncGmailReplies])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation?.messages])

  const toAddress =
    channel === "EMAIL"
      ? conversation?.customer.email
      : conversation?.customer.phone

  const handleSend = async () => {
    if (!body.trim() || !toAddress) return

    setSending(true)
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/conversations/${conversationId}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, body, to: toAddress }),
        }
      )
      if (res.ok) {
        setBody("")
        await fetchConversation()
        onMessageSent?.()
      }
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Loading conversation...
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Conversation not found
      </div>
    )
  }

  const displayName =
    conversation.customer.name ||
    conversation.customer.email ||
    conversation.customer.phone ||
    "Unknown"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{displayName}</h3>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            {conversation.customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3" />
                {conversation.customer.email}
              </span>
            )}
            {conversation.customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {conversation.customer.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-3 p-4">
          {conversation.messages.map((message) => {
            const isOutbound = message.direction === "OUTBOUND"

            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isOutbound ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] space-y-1 rounded-lg px-3 py-2",
                    isOutbound
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-1.5 text-[10px]",
                      isOutbound
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    <Badge
                      variant={isOutbound ? "secondary" : "outline"}
                      className="h-4 px-1 text-[10px]"
                    >
                      {message.channel}
                    </Badge>
                    {isOutbound && (
                      <Badge
                        variant={statusVariant(message.status)}
                        className="h-4 px-1 text-[10px]"
                      >
                        {message.status}
                      </Badge>
                    )}
                    <span>
                      {format(new Date(message.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Reply composer */}
      <div className="border-t p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Tabs
              value={channel}
              onValueChange={(v) => setChannel(v as "EMAIL" | "SMS")}
            >
              <TabsList>
                <TabsTrigger value="EMAIL" className="gap-1">
                  <Mail className="size-3" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="SMS" className="gap-1">
                  <Phone className="size-3" />
                  SMS
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {toAddress && (
              <span className="text-muted-foreground text-xs">
                To: {toAddress}
              </span>
            )}
          </div>

          {!toAddress ? (
            <p className="text-muted-foreground text-sm">
              No {channel === "EMAIL" ? "email" : "phone number"} on file for
              this customer.
            </p>
          ) : (
            <div className="flex gap-2">
              <Textarea
                placeholder={`Type your ${channel === "EMAIL" ? "email" : "message"}...`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSend()
                  }
                }}
                className="min-h-[60px] flex-1 resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!body.trim() || sending}
                className="self-end"
              >
                <Send className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
