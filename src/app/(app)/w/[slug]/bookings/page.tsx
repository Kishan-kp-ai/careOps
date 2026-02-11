import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { BookingsContent } from "@/components/bookings/bookings-content"

export default async function BookingsPage({
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
      <Header title="Bookings" />
      <BookingsContent workspaceId={workspace.id} workspaceSlug={slug} />
    </div>
  )
}
