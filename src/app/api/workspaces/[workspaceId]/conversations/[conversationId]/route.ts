import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; conversationId: string }> }
) {
  try {
    const { workspaceId, conversationId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: {
        customer: true,
        lead: true,
        booking: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json(conversation)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
