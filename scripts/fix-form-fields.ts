import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const db = new PrismaClient({ adapter })

  const redundantFields = ["name", "fullName", "full_name", "phone", "email", "emaile", "customerName", "customerEmail", "customerPhone"]

  const forms = await db.formDefinition.findMany()

  for (const form of forms) {
    const fields = form.fields as Array<{ name: string; label: string; type: string; required?: boolean }>
    const filtered = fields.filter(
      (f) => f.name && !redundantFields.includes(f.name.toLowerCase())
    )

    if (filtered.length < fields.length) {
      const removed = fields.length - filtered.length
      await db.formDefinition.update({
        where: { id: form.id },
        data: { fields: filtered },
      })
      console.log(`"${form.name}": removed ${removed} redundant field(s) (name/phone/email)`)
    } else {
      console.log(`"${form.name}": no redundant fields found`)
    }
  }

  console.log("\nDone!")
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
