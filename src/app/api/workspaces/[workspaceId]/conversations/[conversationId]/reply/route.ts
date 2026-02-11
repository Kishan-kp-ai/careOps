import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"
import { sendMessage } from "@/lib/channels"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; conversationId: string }> }
) {
  try {
    const { workspaceId, conversationId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const body = await request.json()
    const { channel, body: messageBody, to, toAddress } = body
    const recipientAddress = to || toAddress

    if (!channel || !["EMAIL", "SMS"].includes(channel)) {
      return NextResponse.json(
        { error: "Channel must be EMAIL or SMS" },
        { status: 400 }
      )
    }

    if (!messageBody || !recipientAddress) {
      return NextResponse.json(
        { error: "body and to are required" },
        { status: 400 }
      )
    }

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, workspaceId },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const message = await db.message.create({
      data: {
        conversationId,
        channel,
        direction: "OUTBOUND",
        status: "QUEUED",
        toAddress: recipientAddress,
        body: messageBody,
      },
    })

    const result = await sendMessage({
      workspaceId,
      channel,
      to: recipientAddress,
      subject: conversation.subject || undefined,
      body: messageBody,
      threadId: conversation.gmailThreadId || undefined,
    })

    const updatedMessage = await db.message.update({
      where: { id: message.id },
      data: {
        status: result.success ? "SENT" : "FAILED",
        providerRef: result.providerRef,
        sentAt: result.success ? new Date() : undefined,
      },
    })

    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        isAutomationPaused: true,
        ...(result.threadId ? { gmailThreadId: result.threadId } : {}),
      },
    })

    return NextResponse.json(updatedMessage, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
