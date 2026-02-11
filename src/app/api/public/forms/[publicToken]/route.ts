import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logEvent } from "@/lib/events"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params

    const booking = await db.booking.findUnique({
      where: { publicToken },
      include: {
        formAssignments: {
          include: { form: true, submission: true },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json(booking.formAssignments)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params
    const body = await request.json()
    const { assignmentId, data } = body

    if (!assignmentId || !data) {
      return NextResponse.json(
        { error: "assignmentId and data are required" },
        { status: 400 }
      )
    }

    const booking = await db.booking.findUnique({
      where: { publicToken },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const assignment = await db.formAssignment.findFirst({
      where: { id: assignmentId, bookingId: booking.id },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const now = new Date()

    const submission = await db.formSubmission.create({
      data: {
        assignmentId,
        data,
      },
    })

    await db.formAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "submitted",
        completedAt: now,
      },
    })

    await logEvent({
      workspaceId: booking.workspaceId,
      type: "FORM_SUBMITTED",
      entityType: "FormSubmission",
      entityId: submission.id,
      payload: {
        bookingId: booking.id,
        formId: assignment.formId,
        assignmentId,
      },
    })

    return NextResponse.json({ success: true, submissionId: submission.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
