import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { AiAgentContent } from "@/components/ai-agent/ai-agent-content"

export default async function AiAgentPage({
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
    notFound()
  }

  return (
    <div className="space-y-6">
      <Header
        title="AI Agent"
        description="Control the tone of your automated messages"
      />
      <AiAgentContent workspaceId={workspace.id} workspaceName={workspace.name} />
    </div>
  )
}
