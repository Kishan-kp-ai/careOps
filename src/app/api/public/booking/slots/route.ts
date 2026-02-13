import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { format, startOfDay, endOfDay } from "date-fns"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceSlug = searchParams.get("workspaceSlug")
    const bookingTypeId = searchParams.get("bookingTypeId")
    const date = searchParams.get("date")

    if (!workspaceSlug || !bookingTypeId || !date) {
      return NextResponse.json(
        { error: "workspaceSlug, bookingTypeId, and date are required" },
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

    const targetDate = new Date(date)

    const bookings = await db.booking.findMany({
      where: {
        workspaceId: workspace.id,
        bookingTypeId,
        NOT: { status: "CANCELLED" },
        startAt: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate),
        },
      },
      orderBy: { startAt: "asc" },
    })

    const bookedSlots = bookings.map((booking) =>
      format(booking.startAt, "HH:mm")
    )

    return NextResponse.json({ bookedSlots })
  } catch (error) {
    console.error("GET /api/public/booking/slots error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
