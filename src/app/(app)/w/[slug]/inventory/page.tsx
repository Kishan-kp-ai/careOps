import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { InventoryContent } from "@/components/inventory/inventory-content"

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const workspace = await db.workspace.findUnique({
    where: { slug },
  })

  if (!workspace) {
    notFound()
  }

  return <InventoryContent workspaceId={workspace.id} />
}
