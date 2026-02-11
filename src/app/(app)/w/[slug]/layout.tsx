import { notFound } from "next/navigation"
import { requireWorkspaceMember } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { Sidebar } from "@/components/layout/sidebar"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const workspace = await db.workspace.findUnique({
    where: { slug },
  })

  if (!workspace) {
    notFound()
  }

  const { role } = await requireWorkspaceMember(workspace.id)

  return (
    <div className="flex h-screen">
      <Sidebar
        workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
        userRole={role}
      />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
