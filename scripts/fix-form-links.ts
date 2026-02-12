import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const db = new PrismaClient({ adapter })

  // 1. Check all booking types
  const bookingTypes = await db.bookingType.findMany({
    select: { id: true, name: true, linkedFormIds: true, workspaceId: true, isActive: true },
  })

  console.log("\n--- Booking Types ---")
  for (const bt of bookingTypes) {
    console.log(`"${bt.name}" — linkedFormIds: [${bt.linkedFormIds.join(", ")}] (active: ${bt.isActive})`)
  }

  // 2. Get all forms
  const forms = await db.formDefinition.findMany({
    select: { id: true, name: true, workspaceId: true, isActive: true },
  })

  console.log("\n--- Form Definitions ---")
  for (const f of forms) {
    console.log(`"${f.name}" — id: ${f.id} (active: ${f.isActive})`)
  }

  // 3. Link forms to booking types that have empty linkedFormIds
  for (const bt of bookingTypes) {
    if (bt.linkedFormIds.length === 0) {
      const form = forms.find((f) => f.workspaceId === bt.workspaceId && f.isActive)
      if (form) {
        await db.bookingType.update({
          where: { id: bt.id },
          data: { linkedFormIds: [form.id] },
        })
        console.log(`\n✅ Linked form "${form.name}" → booking type "${bt.name}"`)
      }
    }
  }

  // 4. Check & fix automation rules
  const rules = await db.automationRule.findMany({
    where: { trigger: "BOOKING_CREATED" },
  })

  console.log("\n--- BOOKING_CREATED Automation Rules ---")
  for (const rule of rules) {
    const actions = rule.actions as Array<Record<string, string>>
    console.log(`"${rule.name}" — actions:`)
    for (const action of actions) {
      console.log(`  type: ${action.type}, body includes formUrl: ${action.body?.includes("{{formUrl}}") ?? false}`)
      if (action.body && !action.body.includes("{{formUrl}}")) {
        action.body += "\n\nPlease complete the required form here: {{formUrl}}"
      }
    }
    await db.automationRule.update({
      where: { id: rule.id },
      data: { actions },
    })
    console.log(`  ✅ Updated`)
  }

  console.log("\nDone!")
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
