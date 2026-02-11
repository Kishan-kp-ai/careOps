import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"
import { logEvent } from "@/lib/events"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; itemId: string }> }
) {
  try {
    const { workspaceId, itemId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const body = await request.json()
    const { type, delta, note } = body

    if (!type || !["adjust", "consume", "restock"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be one of: adjust, consume, restock" },
        { status: 400 }
      )
    }

    if (typeof delta !== "number" || delta === 0) {
      return NextResponse.json(
        { error: "Delta must be a non-zero number" },
        { status: 400 }
      )
    }

    const item = await db.inventoryItem.findFirst({
      where: { id: itemId, workspaceId },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    const newQuantity = item.quantity + delta

    const [updatedItem] = await db.$transaction([
      db.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
      }),
      db.inventoryTransaction.create({
        data: {
          workspaceId,
          itemId,
          type,
          delta,
          note,
        },
      }),
    ])

    if (newQuantity <= item.lowStockThreshold) {
      await logEvent({
        workspaceId,
        type: "INVENTORY_LOW",
        entityType: "InventoryItem",
        entityId: itemId,
        payload: {
          itemName: item.name,
          quantity: newQuantity,
          threshold: item.lowStockThreshold,
        },
      })
    }

    return NextResponse.json(updatedItem)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
