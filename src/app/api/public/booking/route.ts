import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logEvent } from "@/lib/events"
import { sendMessage } from "@/lib/channels"
import { v4 as uuidv4 } from "uuid"
import { addMinutes, format } from "date-fns"

function getTimezoneOffsetMs(tz: string, date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" })
  const tzStr = date.toLocaleString("en-US", { timeZone: tz })
  return new Date(tzStr).getTime() - new Date(utcStr).getTime()
}

function toUTC(dateStr: string, timeStr: string, tz: string): Date {
  const utcDate = new Date(`${dateStr}T${timeStr}:00Z`)
  const offsetMs = getTimezoneOffsetMs(tz, utcDate)
  return new Date(utcDate.getTime() - offsetMs)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceSlug, bookingTypeId, date, time, name, email, phone, notes } = body

    if (!workspaceSlug || !bookingTypeId || !date || !time || !name || !email) {
      return NextResponse.json(
        { error: "workspaceSlug, bookingTypeId, date, time, name, and email are required" },
        { status: 400 }
      )
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
    })

    if (!workspace || workspace.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Workspace not found or not active" },
        { status: 404 }
      )
    }

    const bookingType = await db.bookingType.findFirst({
      where: { id: bookingTypeId, workspaceId: workspace.id, isActive: true },
    })

    if (!bookingType) {
      return NextResponse.json(
        { error: "Booking type not found or inactive" },
        { status: 404 }
      )
    }

    // Convert date + time to UTC using workspace timezone
    const tz = workspace.timezone || "UTC"
    const startDate = toUTC(date, time, tz)
    const endDate = addMinutes(startDate, bookingType.durationMin)

    // Check for overlapping bookings
    const overlapping = await db.booking.findFirst({
      where: {
        workspaceId: workspace.id,
        bookingTypeId,
        NOT: { status: "CANCELLED" },
        startAt: { lt: endDate },
        endAt: { gt: startDate },
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: "This time slot is already booked. Please choose another time." },
        { status: 409 }
      )
    }

    let customer = await db.customer.findFirst({
      where: { workspaceId: workspace.id, email },
    })

    if (!customer) {
      customer = await db.customer.create({
        data: {
          workspaceId: workspace.id,
          name,
          email,
          phone,
        },
      })
    }

    const publicToken = uuidv4()

    const booking = await db.booking.create({
      data: {
        workspaceId: workspace.id,
        bookingTypeId,
        customerId: customer.id,
        startAt: startDate,
        endAt: endDate,
        notes,
        publicToken,
      },
    })

    const now = new Date()

    const conversation = await db.conversation.create({
      data: {
        workspaceId: workspace.id,
        customerId: customer.id,
        bookingId: booking.id,
        subject: `Booking request: ${bookingType.name}`,
        lastMessageAt: now,
      },
    })

    await db.message.create({
      data: {
        conversationId: conversation.id,
        channel: "EMAIL",
        direction: "INBOUND",
        status: "RECEIVED",
        fromAddress: email,
        body: `Booking request from ${name} for ${bookingType.name} on ${startDate.toISOString()}`,
        receivedAt: now,
      },
    })

    if (bookingType.linkedFormIds.length > 0) {
      await db.formAssignment.createMany({
        data: bookingType.linkedFormIds.map((formId) => ({
          workspaceId: workspace.id,
          bookingId: booking.id,
          formId,
          sentAt: now,
        })),
      })
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const hasLinkedForms = bookingType.linkedFormIds.length > 0
    const formsUrl = hasLinkedForms ? `${baseUrl}/forms/${publicToken}` : null

    const dateStr = startDate.toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    if (phone) {
      const smsBody = hasLinkedForms
        ? `Hi ${name}, your booking request for ${bookingType.name} on ${dateStr} has been received. Please complete the required form here: ${formsUrl} We'll confirm shortly.`
        : `Hi ${name}, your booking request for ${bookingType.name} on ${dateStr} has been received. We'll confirm shortly.`

      const smsResult = await sendMessage({
        workspaceId: workspace.id,
        channel: "SMS",
        to: phone,
        body: smsBody,
      })

      if (smsResult.success) {
        await db.message.create({
          data: {
            conversationId: conversation.id,
            channel: "SMS",
            direction: "OUTBOUND",
            status: "SENT",
            toAddress: phone,
            body: smsBody,
            providerRef: smsResult.providerRef,
            sentAt: new Date(),
          },
        })
      } else {
        console.error("[Booking SMS] Failed to send:", smsResult.error)
      }
    }

    await logEvent({
      workspaceId: workspace.id,
      type: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: booking.id,
      payload: {
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        bookingType: bookingType.name,
        startAt: dateStr,
        formUrl: formsUrl || "",
      },
    })

    return NextResponse.json(
      {
        bookingId: booking.id,
        publicToken,
        formsUrl: `/forms/${publicToken}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/public/booking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
