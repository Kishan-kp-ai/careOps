import Link from "next/link"
import { db } from "@/lib/db"
import { WorkspaceStatus } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarIcon, MailIcon, MapPinIcon } from "lucide-react"

export default async function PublicWorkspacePage({
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
      address: true,
      contactEmail: true,
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
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {workspace.name}
        </h1>
        {workspace.address && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-gray-500">
            <MapPinIcon className="size-4" />
            {workspace.address}
          </p>
        )}
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-4">
          <Button asChild size="lg" className="w-full text-base">
            <Link href={`/b/${workspace.slug}/book`}>
              <CalendarIcon className="size-5" />
              Book an Appointment
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full text-base"
          >
            <Link href={`/b/${workspace.slug}/contact`}>
              <MailIcon className="size-5" />
              Contact Us
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
