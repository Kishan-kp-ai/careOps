import { db } from "@/lib/db"
import { sendMessage } from "@/lib/channels"
import { EventType, Prisma } from "@/generated/prisma/client"

export async function logEvent(params: {
  workspaceId: string
  type: EventType
  entityType: string
  entityId: string
  payload?: Prisma.InputJsonValue
}) {
  const event = await db.eventLog.create({ data: params })

  const payloadObj =
    params.payload && typeof params.payload === "object" && !Array.isArray(params.payload)
      ? (params.payload as Record<string, unknown>)
      : {}

  await runAutomations(params.workspaceId, params.type, params.entityType, params.entityId, payloadObj)

  return event
}

async function runAutomations(
  workspaceId: string,
  trigger: EventType,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>
) {
  const rules = await db.automationRule.findMany({
    where: { workspaceId, trigger, isActive: true },
  })

  console.log(`[Automation] Trigger: ${trigger}, Found ${rules.length} rules for workspace ${workspaceId}`)

  for (const rule of rules) {
    const actions = rule.actions as Array<{
      type: string
      channel?: "EMAIL" | "SMS"
      to?: string
      subject?: string
      body?: string
    }>

    for (const action of actions) {
      if (action.type === "send_email" || action.type === "send_sms") {
        const to = resolveTemplate(action.to || "", payload)
        const body = resolveTemplate(action.body || "", payload)
        const subject = action.subject
          ? resolveTemplate(action.subject, payload)
          : undefined
        const channel =
          action.type === "send_sms" ? ("SMS" as const) : ("EMAIL" as const)

        if (to) {
          console.log(`[Automation] Sending ${channel} to: ${to}, subject: ${subject}`)
          const result = await sendMessage({ workspaceId, channel, to, subject, body })
          console.log(`[Automation] Send result:`, result)

          if (result.threadId && channel === "EMAIL") {
            await saveThreadId(entityType, entityId, result.threadId)
          }
        }
      }
    }
  }
}

async function saveThreadId(entityType: string, entityId: string, threadId: string) {
  try {
    if (entityType === "Booking") {
      const conversation = await db.conversation.findUnique({
        where: { bookingId: entityId },
      })
      if (conversation) {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { gmailThreadId: threadId },
        })
        console.log(`[Automation] Saved gmailThreadId ${threadId} for booking conversation ${conversation.id}`)
      }
    } else if (entityType === "Lead") {
      const conversation = await db.conversation.findUnique({
        where: { leadId: entityId },
      })
      if (conversation) {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { gmailThreadId: threadId },
        })
        console.log(`[Automation] Saved gmailThreadId ${threadId} for lead conversation ${conversation.id}`)
      }
    }
  } catch (error) {
    console.error("[Automation] Failed to save threadId:", error)
  }
}

function resolveTemplate(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    const parts = key.split(".")
    let value: unknown = data
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[part]
      } else {
        return ""
      }
    }
    return String(value ?? "")
  })
}
