import { db } from "@/lib/db"
import { WorkspaceStatus } from "@/generated/prisma/client"
import { BookingForm } from "@/components/public/booking-form"

export default async function PublicBookingPage({
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
      bookingTypes: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMin: true,
          location: true,
          availability: true,
        },
      },
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
    <BookingForm
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug, address: workspace.address }}
      bookingTypes={workspace.bookingTypes}
    />
  )
}
