import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireOwner, ApiError } from "@/lib/auth-utils"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireOwner(workspaceId)

    const channelCount = await db.channelAccount.count({
      where: { workspaceId },
    })

    if (channelCount === 0) {
      return NextResponse.json(
        { error: "At least one channel account is required to activate" },
        { status: 400 }
      )
    }

    const bookingTypeCount = await db.bookingType.count({
      where: { workspaceId, isActive: true },
    })

    if (bookingTypeCount === 0) {
      return NextResponse.json(
        { error: "At least one active booking type is required to activate" },
        { status: 400 }
      )
    }

    const workspace = await db.workspace.update({
      where: { id: workspaceId },
      data: { status: "ACTIVE" },
    })

    // Auto-link forms to booking types that have no linked forms
    const forms = await db.formDefinition.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true },
    })

    if (forms.length > 0) {
      const formIds = forms.map((f) => f.id)
      const unlinkedBookingTypes = await db.bookingType.findMany({
        where: { workspaceId, isActive: true, linkedFormIds: { isEmpty: true } },
        select: { id: true },
      })

      for (const bt of unlinkedBookingTypes) {
        await db.bookingType.update({
          where: { id: bt.id },
          data: { linkedFormIds: formIds },
        })
      }
    }

    const existingRules = await db.automationRule.count({ where: { workspaceId } })

    if (existingRules > 0) {
      // Update existing LEAD_CREATED rules to include booking URL
      const leadRules = await db.automationRule.findMany({
        where: { workspaceId, trigger: "LEAD_CREATED" },
      })
      for (const rule of leadRules) {
        const actions = rule.actions as Array<{ type: string; body?: string; [key: string]: unknown }>
        const updated = actions.map((a) => {
          if ((a.type === "send_email" || a.type === "send_sms") && a.body && !a.body.includes("{{bookingUrl}}")) {
            return { ...a, body: a.body + (a.type === "send_email" ? "\n\nBook an appointment directly here: {{bookingUrl}}" : " Book an appointment here: {{bookingUrl}}") }
          }
          return a
        })
        await db.automationRule.update({ where: { id: rule.id }, data: { actions: updated } })
      }

      // Update existing BOOKING_CONFIRMED rules to include address
      const confirmedRules = await db.automationRule.findMany({
        where: { workspaceId, trigger: "BOOKING_CONFIRMED" },
      })
      for (const rule of confirmedRules) {
        const actions = rule.actions as Array<{ type: string; body?: string; [key: string]: unknown }>
        const updated = actions.map((a) => {
          if (a.type === "send_email" && a.body && !a.body.includes("{{address}}")) {
            return { ...a, body: a.body.replace("We look forward to seeing you!", "Address: {{address}}\n\nWe look forward to seeing you!") }
          }
          return a
        })
        await db.automationRule.update({ where: { id: rule.id }, data: { actions: updated } })
      }

      return NextResponse.json(workspace)
    }

    await db.automationRule.createMany({
      data: [
        {
          workspaceId,
          name: "Welcome message on new lead",
          trigger: "LEAD_CREATED",
          actions: [
            {
              type: "send_email",
              to: "{{customerEmail}}",
              subject: "Thank you for contacting us",
              body: "Hi {{customerName}}, thank you for reaching out. We will get back to you shortly.\n\nBook an appointment directly here: {{bookingUrl}}",
            },
            {
              type: "send_sms",
              to: "{{customerPhone}}",
              body: "Hi {{customerName}}, thank you for contacting us. Book an appointment here: {{bookingUrl}}",
            },
          ],
        },
        {
          workspaceId,
          name: "Booking confirmation",
          trigger: "BOOKING_CREATED",
          actions: [
            {
              type: "send_email",
              to: "{{customerEmail}}",
              subject: "Booking Confirmation",
              body: "Hi {{customerName}}, your booking for {{bookingType}} on {{startAt}} has been received. We will confirm it shortly.\n\n{{formUrl}}",
            },
          ],
        },
        {
          workspaceId,
          name: "Booking confirmed notification",
          trigger: "BOOKING_CONFIRMED",
          actions: [
            {
              type: "send_email",
              to: "{{customerEmail}}",
              subject: "Your Booking is Confirmed",
              body: "Hi {{customerName}}, great news! Your booking for {{bookingType}} on {{startAt}} has been confirmed.\n\nAddress: {{address}}\n\nWe look forward to seeing you!",
            },
          ],
        },
        {
          workspaceId,
          name: "Booking cancelled notification",
          trigger: "BOOKING_CANCELLED",
          actions: [
            {
              type: "send_email",
              to: "{{customerEmail}}",
              subject: "Booking Cancelled",
              body: "Hi {{customerName}}, your booking for {{bookingType}} on {{startAt}} has been cancelled. If this was a mistake, please contact us to rebook.",
            },
          ],
        },
      ],
    })

    return NextResponse.json(workspace)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
