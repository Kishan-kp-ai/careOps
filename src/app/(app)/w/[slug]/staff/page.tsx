import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { StaffContent } from "@/components/staff/staff-content"

export default async function StaffPage({
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

  return <StaffContent workspaceId={workspace.id} />
}
