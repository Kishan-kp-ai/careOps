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

    const items = await db.inventoryItem.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(items)
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
    const { name, sku, quantity, lowStockThreshold, unit } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const item = await db.inventoryItem.create({
      data: {
        workspaceId,
        name,
        sku,
        quantity: quantity || 0,
        lowStockThreshold: lowStockThreshold ?? 5,
        unit,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
