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

    const forms = await db.formDefinition.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(forms)
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
    const { name, description, fields } = body

    if (!name || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: "Name and fields array are required" },
        { status: 400 }
      )
    }

    for (const field of fields) {
      if (!field.key || !field.label || !field.type) {
        return NextResponse.json(
          { error: "Each field must have key, label, and type" },
          { status: 400 }
        )
      }
    }

    const form = await db.formDefinition.create({
      data: {
        workspaceId,
        name,
        description,
        fields,
      },
    })

    return NextResponse.json(form, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
