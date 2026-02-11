import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const db = new PrismaClient({ adapter })

  const intakeFields = [
    { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
    { name: "address", label: "Home Address", type: "text", required: false },
    { name: "allergies", label: "Any Allergies (skin, product, or chemical)", type: "textarea", required: true },
    { name: "skinConditions", label: "Any Skin Conditions (eczema, acne, sensitivity, etc.)", type: "textarea", required: false },
    { name: "currentMedications", label: "Current Medications (if any)", type: "textarea", required: false },
    { name: "previousTreatments", label: "Any Previous Beauty Treatments (list recent ones)", type: "textarea", required: false },
    { name: "preferredProducts", label: "Preferred Products or Brands (if any)", type: "text", required: false },
    { name: "specialRequests", label: "Special Requests or Concerns", type: "textarea", required: false },
    { name: "referralSource", label: "How did you hear about us?", type: "text", required: false },
    { name: "consent", label: "I confirm all information is accurate and consent to the treatment", type: "checkbox", required: true },
  ]

  const consultationFields = [
    { name: "dateOfBirth", label: "Date of Birth", type: "date", required: true },
    { name: "skinType", label: "Skin Type", type: "select", required: true, options: ["Normal", "Oily", "Dry", "Combination", "Sensitive"] },
    { name: "hairType", label: "Hair Type", type: "select", required: false, options: ["Straight", "Wavy", "Curly", "Coily", "Not applicable"] },
    { name: "allergies", label: "Any Known Allergies", type: "textarea", required: true },
    { name: "medicalConditions", label: "Any Medical Conditions we should know about", type: "textarea", required: false },
    { name: "currentRoutine", label: "Current Beauty/Skincare Routine", type: "textarea", required: false },
    { name: "goals", label: "What are your beauty/treatment goals?", type: "textarea", required: true },
    { name: "previousExperience", label: "Any bad experiences with past treatments?", type: "textarea", required: false },
    { name: "consent", label: "I confirm all information is accurate and consent to the consultation", type: "checkbox", required: true },
  ]

  const forms = await db.formDefinition.findMany()

  for (const form of forms) {
    if (form.name.includes("Intake")) {
      await db.formDefinition.update({
        where: { id: form.id },
        data: { fields: intakeFields },
      })
      console.log(`Updated "${form.name}" with ${intakeFields.length} fields`)
    } else if (form.name.includes("Consultation")) {
      await db.formDefinition.update({
        where: { id: form.id },
        data: { fields: consultationFields },
      })
      console.log(`Updated "${form.name}" with ${consultationFields.length} fields`)
    } else {
      console.log(`Skipped "${form.name}" — no matching template`)
    }
  }

  console.log("\nDone!")
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
