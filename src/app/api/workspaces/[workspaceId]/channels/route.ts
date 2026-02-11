import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, apiRequireOwner, ApiError } from "@/lib/auth-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const channels = await db.channelAccount.findMany({
      where: { workspaceId },
      select: {
        id: true,
        type: true,
        provider: true,
        fromAddress: true,
        fromNumber: true,
        isActive: true,
      },
    })

    return NextResponse.json({ channels })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireOwner(workspaceId)

    const body = await request.json()
    const { channels } = body

    if (!Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json(
        { error: "At least one channel is required" },
        { status: 400 }
      )
    }

    for (const ch of channels) {
      if (!ch.type || !["EMAIL", "SMS"].includes(ch.type)) {
        return NextResponse.json(
          { error: "Each channel must have a valid type (EMAIL or SMS)" },
          { status: 400 }
        )
      }
    }

    const created = await db.$transaction(
      channels.map((ch: { type: "EMAIL" | "SMS"; fromAddress?: string; fromNumber?: string }) =>
        db.channelAccount.create({
          data: {
            workspaceId,
            type: ch.type,
            provider: "mock",
            fromAddress: ch.fromAddress,
            fromNumber: ch.fromNumber,
          },
        })
      )
    )

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
