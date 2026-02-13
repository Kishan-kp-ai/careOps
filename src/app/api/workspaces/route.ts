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

    // Check if this owner already has a workspace with the same name
    const duplicateOwned = await db.workspace.findFirst({
      where: {
        name,
        members: {
          some: { userId: user.id, role: "OWNER" },
        },
      },
    })

    if (duplicateOwned) {
      return NextResponse.json(
        { error: `You already have a workspace named "${name}"` },
        { status: 409 }
      )
    }

    // Auto-increment slug if taken by a different owner
    let finalSlug = slug || generateSlug(name)
    let suffix = 2
    while (await db.workspace.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug || generateSlug(name)}-${suffix}`
      suffix++
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
