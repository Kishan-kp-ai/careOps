import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import LandingPage from "@/components/landing-page"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user) {
    return <LandingPage />
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id! },
    include: { workspace: true },
  })

  if (membership) {
    redirect(`/w/${membership.workspace.slug}/dashboard`)
  }

  redirect("/onboarding")
}
