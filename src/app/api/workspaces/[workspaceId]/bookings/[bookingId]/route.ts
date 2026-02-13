import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"
import { logEvent } from "@/lib/events"
import { sendMessage } from "@/lib/channels"
import { BookingStatus, EventType } from "@/generated/prisma/client"
import { format } from "date-fns"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; bookingId: string }> }
) {
  try {
    const { workspaceId, bookingId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const booking = await db.booking.findFirst({
      where: { id: bookingId, workspaceId },
      include: {
        bookingType: true,
        customer: true,
        conversation: { include: { messages: true } },
        formAssignments: {
          include: { form: true, submission: true },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const statusEventMap: Partial<Record<BookingStatus, EventType>> = {
  CONFIRMED: "BOOKING_CONFIRMED",
  CANCELLED: "BOOKING_CANCELLED",
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; bookingId: string }> }
) {
  try {
    const { workspaceId, bookingId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const body = await request.json()
    const { status } = body

    const validStatuses: BookingStatus[] = [
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ]

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: CONFIRMED, COMPLETED, CANCELLED, NO_SHOW" },
        { status: 400 }
      )
    }

    const existing = await db.booking.findFirst({
      where: { id: bookingId, workspaceId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = await db.booking.update({
      where: { id: bookingId },
      data: { status },
      include: { bookingType: true, customer: true },
    })

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { timezone: true },
    })
    const tz = workspace?.timezone || "UTC"

    const dateStr = new Date(booking.startAt).toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    if (
      (status === "CONFIRMED" || status === "CANCELLED") &&
      booking.customer.phone
    ) {
      const smsBody =
        status === "CONFIRMED"
          ? `Hi ${booking.customer.name}, your booking for ${booking.bookingType.name} on ${dateStr} has been confirmed. See you then!`
          : `Hi ${booking.customer.name}, your booking for ${booking.bookingType.name} on ${dateStr} has been cancelled. Contact us if you have questions.`

      const smsResult = await sendMessage({
        workspaceId,
        channel: "SMS",
        to: booking.customer.phone,
        body: smsBody,
      })

      if (smsResult.success) {
        const conversation = await db.conversation.findUnique({
          where: { bookingId },
        })

        if (conversation) {
          await db.message.create({
            data: {
              conversationId: conversation.id,
              channel: "SMS",
              direction: "OUTBOUND",
              status: "SENT",
              toAddress: booking.customer.phone,
              body: smsBody,
              providerRef: smsResult.providerRef,
              sentAt: new Date(),
            },
          })
        }
      } else {
        console.error("[Booking SMS] Failed to send:", smsResult.error)
      }
    }

    const eventType = statusEventMap[status as BookingStatus]
    if (eventType) {
      await logEvent({
        workspaceId,
        type: eventType,
        entityType: "Booking",
        entityId: bookingId,
        payload: {
          previousStatus: existing.status,
          newStatus: status,
          customerName: booking.customer.name,
          customerEmail: booking.customer.email,
          customerPhone: booking.customer.phone,
          bookingType: booking.bookingType.name,
          startAt: dateStr,
        },
      })
    }

    return NextResponse.json(booking)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
