import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const pendingAssignments = await db.formAssignment.findMany({
      where: { workspaceId, status: "pending" },
      include: {
        form: { select: { name: true } },
        booking: {
          include: {
            customer: { select: { name: true, email: true, phone: true } },
            bookingType: { select: { name: true } },
          },
        },
      },
      orderBy: { sentAt: "asc" },
    })

    return NextResponse.json(pendingAssignments)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
