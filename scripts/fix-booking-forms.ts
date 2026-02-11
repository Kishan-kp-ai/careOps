import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const db = new PrismaClient({ adapter })

  // 1. Update existing BOOKING_CREATED automation rules to include {{formUrl}}
  const rules = await db.automationRule.findMany({
    where: { trigger: "BOOKING_CREATED" },
  })

  for (const rule of rules) {
    const actions = rule.actions as Array<Record<string, string>>
    let updated = false

    for (const action of actions) {
      if (action.type === "send_email" && action.body && !action.body.includes("{{formUrl}}")) {
        action.body += "\n\nPlease complete the required form here: {{formUrl}}"
        updated = true
      }
    }

    if (updated) {
      await db.automationRule.update({
        where: { id: rule.id },
        data: { actions },
      })
      console.log(`Updated automation rule: "${rule.name}" (${rule.id})`)
    } else {
      console.log(`Rule "${rule.name}" already has formUrl — skipped`)
    }
  }

  if (rules.length === 0) {
    console.log("No BOOKING_CREATED automation rules found")
  }

  // 2. Ensure at least one form exists and is linked to booking types
  const workspaces = await db.workspace.findMany({ where: { status: "ACTIVE" } })

  for (const ws of workspaces) {
    let form = await db.formDefinition.findFirst({
      where: { workspaceId: ws.id, isActive: true },
    })

    if (!form) {
      form = await db.formDefinition.create({
        data: {
          workspaceId: ws.id,
          name: "Patient Intake Form",
          description: "Required form for new bookings",
          fields: [
            { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
            { name: "address", label: "Home Address", type: "text", required: true },
            { name: "emergencyContactName", label: "Emergency Contact Name", type: "text", required: true },
            { name: "emergencyContactPhone", label: "Emergency Contact Phone", type: "tel", required: true },
            { name: "medicalConditions", label: "Medical Conditions / Allergies", type: "textarea", required: false },
            { name: "currentMedications", label: "Current Medications", type: "textarea", required: false },
            { name: "insuranceProvider", label: "Insurance Provider", type: "text", required: false },
            { name: "insuranceId", label: "Insurance ID", type: "text", required: false },
            { name: "reasonForVisit", label: "Reason for Visit / Concerns", type: "textarea", required: true },
            { name: "consent", label: "I agree to the terms and consent to treatment", type: "checkbox", required: true },
          ],
        },
      })
      console.log(`Created intake form for workspace "${ws.name}" (${ws.id})`)
    }

    // Link form to booking types that have no linked forms
    const bookingTypes = await db.bookingType.findMany({
      where: { workspaceId: ws.id, isActive: true, linkedFormIds: { isEmpty: true } },
    })

    for (const bt of bookingTypes) {
      await db.bookingType.update({
        where: { id: bt.id },
        data: { linkedFormIds: [form.id] },
      })
      console.log(`Linked form "${form.name}" to booking type "${bt.name}"`)
    }

    if (bookingTypes.length === 0) {
      console.log(`All booking types in "${ws.name}" already have linked forms`)
    }
  }

  console.log("\nDone!")
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
