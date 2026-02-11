import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  apiRequireWorkspaceMember,
  apiRequireOwner,
  ApiError,
} from "@/lib/auth-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const bookingTypes = await db.bookingType.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(bookingTypes)
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
    const { name, description, durationMin, location, availability, linkedFormIds } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const bookingType = await db.bookingType.create({
      data: {
        workspaceId,
        name,
        description,
        durationMin: durationMin || 60,
        location,
        availability: availability || null,
        linkedFormIds: linkedFormIds || [],
      },
    })

    return NextResponse.json(bookingType, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
