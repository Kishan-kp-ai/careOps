import { db } from "@/lib/db"
import { FormFill } from "@/components/public/form-fill"

export default async function PostBookingFormsPage({
  params,
}: {
  params: Promise<{ slug: string; publicToken: string }>
}) {
  const { publicToken } = await params

  const booking = await db.booking.findUnique({
    where: { publicToken },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      bookingType: {
        select: { name: true },
      },
      customer: {
        select: { name: true },
      },
      formAssignments: {
        select: {
          id: true,
          status: true,
          form: {
            select: {
              id: true,
              name: true,
              description: true,
              fields: true,
            },
          },
        },
      },
    },
  })

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Booking not found
        </h1>
        <p className="mt-2 text-gray-500">
          This link is invalid or has expired.
        </p>
      </div>
    )
  }

  const forms = booking.formAssignments.map((a) => ({
    assignmentId: a.id,
    status: a.status,
    form: {
      id: a.form.id,
      name: a.form.name,
      description: a.form.description,
      fields: a.form.fields as FormField[],
    },
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Complete Your Forms
        </h1>
        <p className="mt-2 text-gray-500">
          Hi {booking.customer.name}, please complete the following forms for
          your <span className="font-medium">{booking.bookingType.name}</span>{" "}
          appointment on{" "}
          <span className="font-medium">
            {booking.startAt.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          .
        </p>
      </div>

      <FormFill publicToken={publicToken} forms={forms} />
    </div>
  )
}

type FormField = {
  name: string
  label: string
  type: "text" | "textarea" | "select" | "checkbox"
  required?: boolean
  options?: string[]
}
