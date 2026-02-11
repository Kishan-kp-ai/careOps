import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"
import { sendMessage } from "@/lib/channels"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; assignmentId: string }> }
) {
  try {
    const { workspaceId, assignmentId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const assignment = await db.formAssignment.findFirst({
      where: { id: assignmentId, workspaceId },
      include: {
        booking: {
          include: {
            customer: true,
            bookingType: true,
          },
        },
        form: true,
      },
    })

    if (!assignment || assignment.status !== "pending") {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const { booking } = assignment
    const { customer, bookingType } = booking

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const formUrl = `${baseUrl}/forms/${booking.publicToken}`

    let smsResult
    let emailResult

    if (customer.phone) {
      smsResult = await sendMessage({
        workspaceId,
        channel: "SMS",
        to: customer.phone,
        body: `Hi ${customer.name}, please complete the required form for your ${bookingType.name} booking: ${formUrl}`,
      })
    }

    if (customer.email) {
      emailResult = await sendMessage({
        workspaceId,
        channel: "EMAIL",
        to: customer.email,
        subject: "Please Complete Your Form",
        body: `Hi ${customer.name}, please complete the required form for your ${bookingType.name} booking: ${formUrl}`,
      })
    }

    await db.formAssignment.update({
      where: { id: assignmentId },
      data: { sentAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      sms: smsResult?.success,
      email: emailResult?.success,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
