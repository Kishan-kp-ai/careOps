import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { FormsContent } from "@/components/forms/forms-content"

export default async function FormsPage({
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

  return <FormsContent workspaceId={workspace.id} />
}
