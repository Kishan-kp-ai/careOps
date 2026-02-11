import { db } from "@/lib/db"
import { sendViaGmail } from "./gmail"
import { sendViaTwilio } from "./twilio"

export type SendMessageInput = {
  workspaceId: string
  channel: "EMAIL" | "SMS"
  to: string
  subject?: string
  body: string
  from?: string
  threadId?: string
}

export type SendResult = {
  success: boolean
  providerRef?: string
  threadId?: string
  error?: string
}

export interface ChannelProvider {
  send(input: SendMessageInput): Promise<SendResult>
}

export async function sendMessage(input: SendMessageInput): Promise<SendResult> {
  try {
    if (input.channel === "EMAIL") {
      const googleChannel = await db.channelAccount.findFirst({
        where: {
          workspaceId: input.workspaceId,
          type: "EMAIL",
          provider: "google",
          isActive: true,
        },
      })

      if (googleChannel) {
        return await sendViaGmail(input.workspaceId, input)
      }
    }

    if (input.channel === "SMS") {
      const twilioChannel = await db.channelAccount.findFirst({
        where: {
          workspaceId: input.workspaceId,
          type: "SMS",
          provider: "twilio",
          isActive: true,
        },
      })

      if (twilioChannel || process.env.TWILIO_ACCOUNT_SID) {
        return await sendViaTwilio(input.workspaceId, input)
      }
    }

    const provider = getProvider(input.channel)
    return await provider.send(input)
  } catch (error) {
    console.error(`[Channel ${input.channel}] Send failed:`, error)
    return { success: false, error: String(error) }
  }
}

function getProvider(channel: "EMAIL" | "SMS"): ChannelProvider {
  if (channel === "SMS") return new MockSmsProvider()
  return new MockEmailProvider()
}

class MockEmailProvider implements ChannelProvider {
  async send(input: SendMessageInput): Promise<SendResult> {
    console.log(`[MockEmail] To: ${input.to}, Subject: ${input.subject}, Body: ${input.body}`)
    return { success: true, providerRef: `mock-email-${Date.now()}` }
  }
}

class MockSmsProvider implements ChannelProvider {
  async send(input: SendMessageInput): Promise<SendResult> {
    console.log(`[MockSMS] To: ${input.to}, Body: ${input.body}`)
    return { success: true, providerRef: `mock-sms-${Date.now()}` }
  }
}
