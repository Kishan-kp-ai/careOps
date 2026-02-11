import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiAuth, ApiError } from "@/lib/auth-utils"
import { generateSlug } from "@/lib/workspace"

export async function POST(request: Request) {
  try {
    const user = await apiAuth()
    const body = await request.json()
    const { name, slug, address, timezone, contactEmail } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const finalSlug = slug || generateSlug(name)

    const existing = await db.workspace.findUnique({
      where: { slug: finalSlug },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A workspace with this slug already exists" },
        { status: 409 }
      )
    }

    const workspace = await db.workspace.create({
      data: {
        name,
        slug: finalSlug,
        address,
        timezone: timezone || "UTC",
        contactEmail,
        status: "DRAFT",
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: { include: { user: true } },
      },
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("POST /api/workspaces error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
