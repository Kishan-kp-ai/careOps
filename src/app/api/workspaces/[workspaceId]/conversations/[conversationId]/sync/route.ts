import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"

interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
}

async function getAccessToken(channelAccountId: string, tokens: GoogleTokens): Promise<string> {
  if (Date.now() < tokens.expiresAt - 60_000) {
    return tokens.accessToken
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) throw new Error("Failed to refresh token")

  const data = await res.json()

  await db.channelAccount.update({
    where: { id: channelAccountId },
    data: {
      config: {
        ...tokens,
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      },
    },
  })

  return data.access_token
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(base64, "base64").toString("utf-8")
}

function extractBody(payload: {
  mimeType?: string
  body?: { data?: string }
  parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>
}): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  if (payload.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain")
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data)
    }
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html")
    if (htmlPart?.body?.data) {
      const html = decodeBase64Url(htmlPart.body.data)
      return html.replace(/<[^>]+>/g, "").trim()
    }
  }

  return ""
}

function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; conversationId: string }> }
) {
  try {
    const { workspaceId, conversationId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: { customer: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    console.log(`[Gmail Sync] Conversation ${conversationId}, gmailThreadId: ${conversation.gmailThreadId}`)

    if (!conversation.gmailThreadId) {
      console.log(`[Gmail Sync] No gmailThreadId — skipping sync`)
      return NextResponse.json({ synced: 0, message: "No Gmail thread linked" })
    }

    const channel = await db.channelAccount.findFirst({
      where: { workspaceId, type: "EMAIL", provider: "google", isActive: true },
    })

    if (!channel?.config) {
      return NextResponse.json({ error: "No Gmail channel connected" }, { status: 400 })
    }

    const tokens = channel.config as unknown as GoogleTokens
    const accessToken = await getAccessToken(channel.id, tokens)

    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${conversation.gmailThreadId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!threadRes.ok) {
      const error = await threadRes.text()
      console.error("[Gmail Sync] Failed to fetch thread:", error)
      return NextResponse.json({ error: "Failed to fetch Gmail thread" }, { status: 502 })
    }

    const thread = await threadRes.json()
    const messages = thread.messages || []

    const existingRefs = await db.message.findMany({
      where: { conversationId },
      select: { providerRef: true },
    })
    const existingRefSet = new Set(existingRefs.map((m) => m.providerRef).filter(Boolean))

    let synced = 0

    for (const msg of messages) {
      if (existingRefSet.has(msg.id)) continue

      const headers = msg.payload?.headers || []
      const from = getHeader(headers, "From") || ""
      const isFromOwner = from.toLowerCase().includes(tokens.email.toLowerCase())

      if (isFromOwner) continue

      const body = extractBody(msg.payload || {})
      if (!body.trim()) continue

      const receivedAt = msg.internalDate
        ? new Date(parseInt(msg.internalDate))
        : new Date()

      await db.message.create({
        data: {
          conversationId,
          channel: "EMAIL",
          direction: "INBOUND",
          status: "RECEIVED",
          fromAddress: from,
          toAddress: tokens.email,
          subject: getHeader(headers, "Subject"),
          body: body.substring(0, 10000),
          providerRef: msg.id,
          receivedAt,
        },
      })

      synced++
    }

    if (synced > 0) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      })
    }

    return NextResponse.json({ synced })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[Gmail Sync] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
