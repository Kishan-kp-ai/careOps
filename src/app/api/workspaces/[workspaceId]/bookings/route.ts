import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"
import { BookingStatus } from "@/generated/prisma/client"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as BookingStatus | null
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: Record<string, unknown> = { workspaceId }

    if (status) {
      where.status = status
    }

    if (from || to) {
      where.startAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        bookingType: true,
        customer: true,
      },
      orderBy: { startAt: "desc" },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
