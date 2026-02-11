import { db } from "@/lib/db"
import type { SendMessageInput, SendResult } from "./index"

interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
}

async function refreshAccessToken(
  channelAccountId: string,
  tokens: GoogleTokens
): Promise<string> {
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

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to refresh Google token: ${error}`)
  }

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

function buildRawEmail(from: string, to: string, subject: string, body: string): string {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    body,
  ]
  const raw = lines.join("\r\n")
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function sendViaGmail(
  workspaceId: string,
  input: SendMessageInput
): Promise<SendResult> {
  const channel = await db.channelAccount.findFirst({
    where: { workspaceId, type: "EMAIL", provider: "google", isActive: true },
  })

  if (!channel || !channel.config) {
    return { success: false, error: "No connected Gmail account found" }
  }

  const tokens = channel.config as unknown as GoogleTokens

  if (!tokens.refreshToken) {
    return { success: false, error: "Gmail refresh token missing. Please reconnect Gmail." }
  }

  const accessToken = await refreshAccessToken(channel.id, tokens)

  const raw = buildRawEmail(
    tokens.email,
    input.to,
    input.subject || "No Subject",
    input.body
  )

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw, ...(input.threadId && { threadId: input.threadId }) }),
    }
  )

  if (!res.ok) {
    const error = await res.text()
    console.error("[Gmail] Send failed:", error)
    return { success: false, error: `Gmail send failed: ${error}` }
  }

  const data = await res.json()
  return { success: true, providerRef: data.id, threadId: data.threadId }
}
