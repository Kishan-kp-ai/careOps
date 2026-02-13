import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let from = ""
    let to = ""
    let body = ""

    // Twilio sends form-urlencoded data
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      from = (formData.get("From") as string) || ""
      to = (formData.get("To") as string) || ""
      body = (formData.get("Body") as string) || ""
    } else {
      const json = await request.json()
      from = json.From || json.from || ""
      to = json.To || json.to || ""
      body = json.Body || json.body || ""
    }

    if (!from || !body) {
      return new Response(
        '<Response><Message>Missing required fields</Message></Response>',
        { status: 400, headers: { "Content-Type": "text/xml" } }
      )
    }

    // Normalize phone numbers (strip +)
    const normalizedFrom = from.replace(/^\+/, "")
    const normalizedTo = to.replace(/^\+/, "")

    // Find the workspace by matching the Twilio number (the "to" number)
    const channelAccount = await db.channelAccount.findFirst({
      where: {
        type: "SMS",
        isActive: true,
        OR: [
          { fromNumber: to },
          { fromNumber: normalizedTo },
          { fromNumber: `+${normalizedTo}` },
        ],
      },
    })

    if (!channelAccount) {
      // Fallback: try env var to find any workspace with active SMS
      const envFromNumber = process.env.TWILIO_FROM_NUMBER
      if (envFromNumber && (to === envFromNumber || `+${normalizedTo}` === envFromNumber)) {
        const fallbackChannel = await db.channelAccount.findFirst({
          where: { type: "SMS", isActive: true },
        })
        if (fallbackChannel) {
          return await handleInboundSms(fallbackChannel.workspaceId, from, normalizedFrom, body)
        }
      }

      console.error("[SMS Inbound] No channel account found for number:", to)
      return new Response(
        '<Response></Response>',
        { status: 200, headers: { "Content-Type": "text/xml" } }
      )
    }

    return await handleInboundSms(channelAccount.workspaceId, from, normalizedFrom, body)
  } catch (error) {
    console.error("[SMS Inbound] Error:", error)
    return new Response(
      '<Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    )
  }
}

async function handleInboundSms(
  workspaceId: string,
  rawFrom: string,
  normalizedFrom: string,
  body: string
) {
  // Find existing customer by phone number
  const customer = await db.customer.findFirst({
    where: {
      workspaceId,
      OR: [
        { phone: rawFrom },
        { phone: normalizedFrom },
        { phone: `+${normalizedFrom}` },
      ],
    },
  })

  if (!customer) {
    console.log("[SMS Inbound] No customer found for phone:", rawFrom)
    return new Response(
      '<Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    )
  }

  // Find existing conversation with this customer, or create one
  let conversation = await db.conversation.findFirst({
    where: {
      workspaceId,
      customerId: customer.id,
    },
    orderBy: { lastMessageAt: "desc" },
  })

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        workspaceId,
        customerId: customer.id,
        subject: `SMS from ${customer.name || rawFrom}`,
        lastMessageAt: new Date(),
      },
    })
  }

  // Save the inbound message
  await db.message.create({
    data: {
      conversationId: conversation.id,
      channel: "SMS",
      direction: "INBOUND",
      status: "RECEIVED",
      fromAddress: rawFrom,
      body,
      receivedAt: new Date(),
    },
  })

  // Update conversation timestamp
  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  })

  // Return empty TwiML response (Twilio expects XML)
  return new Response(
    '<Response></Response>',
    { status: 200, headers: { "Content-Type": "text/xml" } }
  )
}
