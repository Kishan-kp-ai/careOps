import { db } from "@/lib/db"
import { WorkspaceStatus } from "@/generated/prisma/client"
import { ContactForm } from "@/components/public/contact-form"

export default async function PublicContactPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const workspace = await db.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
  })

  if (!workspace || workspace.status !== WorkspaceStatus.ACTIVE) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Business not found
        </h1>
        <p className="mt-2 text-gray-500">
          The business you are looking for does not exist or is no longer
          available.
        </p>
      </div>
    )
  }

  return (
    <ContactForm
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
    />
  )
}
