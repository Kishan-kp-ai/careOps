import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireWorkspaceMember(workspaceId: string) {
  const user = await requireAuth()

  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id!,
      },
    },
    include: { user: true },
  })

  if (!member) {
    throw new Error("Not a member of this workspace")
  }

  return { member, role: member.role, user: member.user }
}

export async function requireOwner(workspaceId: string) {
  const result = await requireWorkspaceMember(workspaceId)

  if (result.role !== "OWNER") {
    throw new Error("Owner access required")
  }

  return result
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export async function apiAuth() {
  const user = await getCurrentUser()
  if (!user?.id) throw new ApiError("Unauthorized", 401)
  return user as { id: string; name?: string | null; email?: string | null }
}

export async function apiRequireWorkspaceMember(workspaceId: string) {
  const user = await apiAuth()

  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id,
      },
    },
    include: { user: true },
  })

  if (!member) throw new ApiError("Not a member of this workspace", 403)

  return { member, role: member.role, user: member.user }
}

export async function apiRequireOwner(workspaceId: string) {
  const result = await apiRequireWorkspaceMember(workspaceId)
  if (result.role !== "OWNER") throw new ApiError("Owner access required", 403)
  return result
}
