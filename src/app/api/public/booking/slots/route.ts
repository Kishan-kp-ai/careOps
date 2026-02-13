import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function getTimezoneOffsetMs(tz: string, date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" })
  const tzStr = date.toLocaleString("en-US", { timeZone: tz })
  return new Date(tzStr).getTime() - new Date(utcStr).getTime()
}

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

    const tz = workspace.timezone || "UTC"
    const targetDate = new Date(date)

    // Get the date string in workspace timezone (YYYY-MM-DD)
    const dayStr = targetDate.toLocaleDateString("en-CA", { timeZone: tz })

    // Compute day boundaries in UTC using the workspace timezone
    const dayStartLocal = new Date(`${dayStr}T00:00:00Z`)
    const dayEndLocal = new Date(`${dayStr}T23:59:59.999Z`)
    const offsetMs = getTimezoneOffsetMs(tz, dayStartLocal)
    const dayStartUtc = new Date(dayStartLocal.getTime() - offsetMs)
    const dayEndUtc = new Date(dayEndLocal.getTime() - offsetMs)

    const bookings = await db.booking.findMany({
      where: {
        workspaceId: workspace.id,
        bookingTypeId,
        NOT: { status: "CANCELLED" },
        startAt: {
          gte: dayStartUtc,
          lte: dayEndUtc,
        },
      },
      orderBy: { startAt: "asc" },
    })

    // Format startAt in workspace timezone (not server timezone)
    const bookedSlots = bookings.map((booking) => {
      return new Date(booking.startAt).toLocaleTimeString("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    })

    return NextResponse.json({ bookedSlots })
  } catch (error) {
    console.error("GET /api/public/booking/slots error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
