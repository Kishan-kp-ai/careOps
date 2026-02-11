import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, apiRequireOwner, ApiError } from "@/lib/auth-utils"
import { sendMessage } from "@/lib/channels"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
    })

    return NextResponse.json(members)
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
    const { email, name } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    })

    let user = await db.user.findUnique({ where: { email } })
    let tempPassword: string | null = null

    if (!user) {
      tempPassword = crypto.randomBytes(6).toString("hex")
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      user = await db.user.create({
        data: { email, name: name || email, password: hashedPassword },
      })
    }

    const existingMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 409 }
      )
    }

    const member = await db.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: "STAFF",
      },
      include: { user: true },
    })

    const workspaceName = workspace?.name || "CareOps"
    const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`

    const emailBody = tempPassword
      ? `Hi ${name || email},\n\nYou have been invited to join "${workspaceName}" on CareOps as a staff member.\n\nHere are your login credentials:\nEmail: ${email}\nPassword: ${tempPassword}\n\nLogin here: ${loginUrl}\n\nPlease change your password after your first login.`
      : `Hi ${name || email},\n\nYou have been invited to join "${workspaceName}" on CareOps as a staff member.\n\nYou can log in with your existing account at: ${loginUrl}`

    await sendMessage({
      workspaceId,
      channel: "EMAIL",
      to: email,
      subject: `You're invited to join ${workspaceName}`,
      body: emailBody,
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
