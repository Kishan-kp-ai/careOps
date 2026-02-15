import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { ServicesContent } from "@/components/services/services-content"

export default async function ServicesPage({
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

  return (
    <div className="space-y-6">
      <Header title="Services" description="Manage the services you offer to customers." />
      <ServicesContent workspaceId={workspace.id} />
    </div>
  )
}
