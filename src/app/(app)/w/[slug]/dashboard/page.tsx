import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const workspace = await db.workspace.findUnique({
    where: { slug },
    select: { id: true, name: true },
  })

  if (!workspace) {
    redirect("/")
  }

  return (
    <div className="space-y-6">
      <Header
        title="Dashboard"
        description={`Overview for ${workspace.name}`}
      />
      <DashboardContent workspaceId={workspace.id} slug={slug} />
    </div>
  )
}
