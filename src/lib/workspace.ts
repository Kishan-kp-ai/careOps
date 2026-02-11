import { db } from "@/lib/db"

export async function getWorkspaceBySlug(slug: string) {
  return db.workspace.findUnique({ where: { slug } })
}

export async function getWorkspaceWithDetails(workspaceId: string) {
  return db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      channelAccounts: true,
      bookingTypes: { where: { isActive: true } },
      members: { include: { user: true } },
    },
  })
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50)
}
