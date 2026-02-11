import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { SettingsContent } from "@/components/settings/settings-content"

export default async function SettingsPage({
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

  return <SettingsContent workspaceId={workspace.id} />
}
