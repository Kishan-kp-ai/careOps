import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireOwner, ApiError } from "@/lib/auth-utils"
import {
  toneTemplates,
  type AlertType,
  type Tone,
  ALERT_TYPES,
  TONES,
} from "@/lib/tone-templates"

const TRIGGER_TO_RULE_NAME: Record<AlertType, string> = {
  LEAD_CREATED: "Welcome message on new lead",
  BOOKING_CREATED: "Booking confirmation",
  BOOKING_CONFIRMED: "Booking confirmed notification",
  BOOKING_CANCELLED: "Booking cancelled notification",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireOwner(workspaceId)

    const rules = await db.automationRule.findMany({
      where: { workspaceId },
      select: { trigger: true, actions: true },
    })

    const currentTones: Record<string, Tone> = {}

    for (const rule of rules) {
      const trigger = rule.trigger as AlertType
      if (!ALERT_TYPES.includes(trigger)) continue

      const actions = rule.actions as Array<{ type: string; body?: string }>
      const emailAction = actions.find((a) => a.type === "send_email")
      if (!emailAction?.body) {
        currentTones[trigger] = "PROFESSIONAL"
        continue
      }

      let matched: Tone = "PROFESSIONAL"
      for (const tone of TONES) {
        const template = toneTemplates[trigger]?.[tone]
        if (template && emailAction.body === template.body) {
          matched = tone
          break
        }
      }
      currentTones[trigger] = matched
    }

    for (const alertType of ALERT_TYPES) {
      if (!currentTones[alertType]) {
        currentTones[alertType] = "PROFESSIONAL"
      }
    }

    return NextResponse.json(currentTones)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireOwner(workspaceId)

    const body = await request.json()
    const { alertType, tone } = body as { alertType: AlertType; tone: Tone }

    if (!ALERT_TYPES.includes(alertType) || !TONES.includes(tone)) {
      return NextResponse.json({ error: "Invalid alertType or tone" }, { status: 400 })
    }

    const template = toneTemplates[alertType][tone]
    const ruleName = TRIGGER_TO_RULE_NAME[alertType]

    const rule = await db.automationRule.findFirst({
      where: { workspaceId, name: ruleName },
    })

    if (!rule) {
      return NextResponse.json(
        { error: `Automation rule "${ruleName}" not found. Please activate your workspace first.` },
        { status: 404 }
      )
    }

    const actions = rule.actions as Array<{
      type: string
      to?: string
      subject?: string
      body?: string
    }>

    const updatedActions = actions.map((action) => {
      if (action.type === "send_email") {
        return { ...action, subject: template.subject, body: template.body }
      }
      if (action.type === "send_sms") {
        return { ...action, body: template.smsBody }
      }
      return action
    })

    const hasSms = updatedActions.some((a) => a.type === "send_sms")
    if (!hasSms) {
      updatedActions.push({
        type: "send_sms",
        to: "{{customerPhone}}",
        body: template.smsBody,
      })
    }

    await db.automationRule.update({
      where: { id: rule.id },
      data: { actions: updatedActions },
    })

    return NextResponse.json({ success: true, alertType, tone })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
