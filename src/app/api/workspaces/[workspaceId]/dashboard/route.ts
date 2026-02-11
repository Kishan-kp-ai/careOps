import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"
import { startOfDay, endOfDay, addDays } from "date-fns"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const upcomingEnd = endOfDay(addDays(now, 7))

    const [
      todayBookings,
      upcomingBookings,
      completedBookings,
      noShowBookings,
      newLeads,
      totalLeads,
      unansweredLeads,
      pendingForms,
      overdueForms,
      completedForms,
      recentActivity,
    ] = await Promise.all([
      db.booking.count({
        where: { workspaceId, startAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.booking.count({
        where: {
          workspaceId,
          startAt: { gte: todayEnd, lte: upcomingEnd },
          status: { in: ["REQUESTED", "CONFIRMED"] },
        },
      }),
      db.booking.count({
        where: { workspaceId, status: "COMPLETED" },
      }),
      db.booking.count({
        where: { workspaceId, status: "NO_SHOW" },
      }),
      db.lead.count({
        where: { workspaceId, status: "new" },
      }),
      db.lead.count({
        where: { workspaceId },
      }),
      db.lead.count({
        where: {
          workspaceId,
          status: "new",
          conversation: {
            messages: { none: { direction: "OUTBOUND" } },
          },
        },
      }),
      db.formAssignment.count({
        where: { workspaceId, status: "pending" },
      }),
      db.formAssignment.count({
        where: {
          workspaceId,
          status: "pending",
          sentAt: { lt: todayStart },
        },
      }),
      db.formAssignment.count({
        where: { workspaceId, status: "submitted" },
      }),
      db.eventLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ])

    const allItems = await db.inventoryItem.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, name: true, quantity: true, lowStockThreshold: true, unit: true },
    })

    const lowStock = allItems.filter((item) => item.quantity <= item.lowStockThreshold)

    return NextResponse.json({
      bookings: {
        today: todayBookings,
        upcoming: upcomingBookings,
        completed: completedBookings,
        noShow: noShowBookings,
      },
      leads: {
        new: newLeads,
        total: totalLeads,
        unanswered: unansweredLeads,
      },
      forms: {
        pending: pendingForms,
        overdue: overdueForms,
        completed: completedForms,
      },
      inventory: {
        lowStock,
      },
      recentActivity,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
