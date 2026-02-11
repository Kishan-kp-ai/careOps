import { db } from "@/lib/db"
import type { SendMessageInput, SendResult } from "./index"

interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber: string
}

export async function sendViaTwilio(
  workspaceId: string,
  input: SendMessageInput
): Promise<SendResult> {
  let config: TwilioConfig | null = null

  const channel = await db.channelAccount.findFirst({
    where: { workspaceId, type: "SMS", provider: "twilio", isActive: true },
  })

  if (channel?.config) {
    const raw = channel.config as unknown as TwilioConfig
    config = {
      accountSid: raw.accountSid,
      authToken: raw.authToken,
      fromNumber: raw.fromNumber,
    }
  }

  if (!config) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_FROM_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        error: "No Twilio account configured and TWILIO env vars are missing",
      }
    }

    config = { accountSid, authToken, fromNumber }
  }

  const { accountSid, authToken, fromNumber } = config

  const toNumber = input.to.startsWith("+") ? input.to : `+${input.to}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      Body: input.body,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error("[Twilio] Send failed:", error)
    return { success: false, error: `Twilio send failed: ${error}` }
  }

  const data = await res.json()
  return { success: true, providerRef: data.sid }
}
