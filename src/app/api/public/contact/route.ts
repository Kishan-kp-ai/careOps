import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logEvent } from "@/lib/events"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceSlug, name, email, phone, message } = body

    if (!workspaceSlug || !name || !email) {
      return NextResponse.json(
        { error: "workspaceSlug, name, and email are required" },
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

    const lead = await db.lead.create({
      data: {
        workspaceId: workspace.id,
        customerId: customer.id,
        source: "contact_form",
        message,
      },
    })

    const now = new Date()

    const conversation = await db.conversation.create({
      data: {
        workspaceId: workspace.id,
        customerId: customer.id,
        leadId: lead.id,
        subject: `Contact from ${name}`,
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
        body: message || `New contact from ${name}`,
        receivedAt: now,
      },
    })

    await logEvent({
      workspaceId: workspace.id,
      type: "LEAD_CREATED",
      entityType: "Lead",
      entityId: lead.id,
      payload: {
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
      },
    })

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
