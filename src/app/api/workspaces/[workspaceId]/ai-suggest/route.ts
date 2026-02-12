import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { apiRequireWorkspaceMember, ApiError } from "@/lib/auth-utils"
import { gemini } from "@/lib/gemini"

const PROMPTS = {
  "booking-types": `You are helping set up a booking/appointment system for a business.
Based on the business name and type, suggest 4-5 relevant booking/appointment types.

Return ONLY a valid JSON array with objects having these fields:
- name (string): appointment type name
- description (string): short description
- durationMin (number): duration in minutes (15, 30, 45, 60, 90, or 120)

Example: [{"name":"Initial Consultation","description":"First-time patient assessment","durationMin":60}]`,

  forms: `You are helping set up intake forms for a business.
Based on the business name and type, suggest a relevant intake form with 5-7 fields.

Return ONLY a valid JSON object with these fields:
- name (string): form name
- description (string): form description
- fields (array): each field has:
  - key (string): snake_case identifier
  - label (string): display label
  - type (string): one of "text", "textarea", "select", "checkbox"
  - required (boolean)
  - options (string array, only if type is "select")

Example: {"name":"Patient Intake Form","description":"Required before your first visit","fields":[{"key":"full_name","label":"Full Name","type":"text","required":true}]}`,

  inventory: `You are helping set up inventory tracking for a business.
Based on the business name and type, suggest 5-7 common supplies/materials they would need to track.

Return ONLY a valid JSON array with objects having these fields:
- name (string): item name
- sku (string): a short SKU code
- quantity (number): suggested initial stock quantity
- lowStockThreshold (number): when to alert for reorder
- unit (string): unit of measurement (e.g., "boxes", "units", "bottles", "packs")

Example: [{"name":"Exam Gloves","sku":"GLV-001","quantity":100,"lowStockThreshold":10,"unit":"boxes"}]`,
}

type BusinessType = "beauty" | "medical" | "fitness" | "dental" | "veterinary" | "default"

function detectBusinessType(name: string): BusinessType {
  const n = name.toLowerCase()
  if (/beauty|salon|parlour|parlor|spa|hair|nail|barber|makeup|skincare|wax|brow|lash/.test(n)) return "beauty"
  if (/clinic|hospital|doctor|medical|health|care|physio|therapy|chiro/.test(n)) return "medical"
  if (/gym|fitness|yoga|pilates|crossfit|training|sport|martial/.test(n)) return "fitness"
  if (/dent|ortho|oral/.test(n)) return "dental"
  if (/vet|animal|pet/.test(n)) return "veterinary"
  return "default"
}

const BOOKING_FALLBACKS: Record<BusinessType, unknown[]> = {
  beauty: [
    { name: "Haircut & Style", description: "Haircut with wash and styling", durationMin: 45 },
    { name: "Hair Coloring", description: "Full color or highlights", durationMin: 90 },
    { name: "Manicure", description: "Nail shaping, cuticle care, and polish", durationMin: 30 },
    { name: "Facial Treatment", description: "Deep cleansing and skincare facial", durationMin: 60 },
    { name: "Waxing", description: "Body or facial waxing service", durationMin: 30 },
  ],
  medical: [
    { name: "General Consultation", description: "Routine check-up and health assessment", durationMin: 30 },
    { name: "Follow-up Visit", description: "Follow-up on previous treatment", durationMin: 15 },
    { name: "Annual Health Check-up", description: "Comprehensive yearly health screening", durationMin: 60 },
    { name: "Specialist Consultation", description: "Consultation with a specialist", durationMin: 45 },
    { name: "Lab Work / Tests", description: "Blood work and diagnostic tests", durationMin: 15 },
  ],
  fitness: [
    { name: "Personal Training", description: "One-on-one training session", durationMin: 60 },
    { name: "Group Class", description: "Group fitness class", durationMin: 45 },
    { name: "Fitness Assessment", description: "Body composition and fitness evaluation", durationMin: 30 },
    { name: "Yoga Session", description: "Guided yoga practice", durationMin: 60 },
    { name: "Nutrition Consultation", description: "Diet and nutrition planning", durationMin: 30 },
  ],
  dental: [
    { name: "Dental Check-up", description: "Routine dental examination", durationMin: 30 },
    { name: "Teeth Cleaning", description: "Professional dental cleaning", durationMin: 45 },
    { name: "Tooth Filling", description: "Cavity filling treatment", durationMin: 60 },
    { name: "Root Canal", description: "Root canal therapy", durationMin: 90 },
    { name: "Teeth Whitening", description: "Professional whitening treatment", durationMin: 60 },
  ],
  veterinary: [
    { name: "Pet Check-up", description: "General wellness examination", durationMin: 30 },
    { name: "Vaccination", description: "Routine vaccination appointment", durationMin: 15 },
    { name: "Pet Grooming", description: "Bath, trim, and nail clipping", durationMin: 60 },
    { name: "Dental Cleaning", description: "Pet dental cleaning", durationMin: 45 },
    { name: "Surgery Consultation", description: "Pre-surgery assessment", durationMin: 30 },
  ],
  default: [
    { name: "Initial Consultation", description: "First-time client assessment", durationMin: 60 },
    { name: "Follow-up Appointment", description: "Returning client check-in", durationMin: 30 },
    { name: "Standard Service", description: "Regular service session", durationMin: 45 },
    { name: "Premium Service", description: "Extended service session", durationMin: 90 },
    { name: "Quick Check-in", description: "Brief appointment for minor needs", durationMin: 15 },
  ],
}

const FORM_FALLBACKS: Record<BusinessType, unknown> = {
  beauty: {
    name: "Beauty Client Intake Form",
    description: "Required information before your appointment",
    fields: [
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      { key: "skin_type", label: "Skin Type", type: "select", required: true, options: ["Normal", "Oily", "Dry", "Combination", "Sensitive"] },
      { key: "allergies", label: "Any Allergies (skin, product, or chemical)", type: "textarea", required: true },
      { key: "skin_conditions", label: "Skin Conditions (eczema, acne, etc.)", type: "textarea", required: false },
      { key: "previous_treatments", label: "Recent Beauty Treatments", type: "textarea", required: false },
      { key: "preferred_products", label: "Preferred Products or Brands", type: "text", required: false },
      { key: "consent", label: "I confirm all information is accurate and consent to treatment", type: "checkbox", required: true },
    ],
  },
  medical: {
    name: "Patient Registration Form",
    description: "Required medical information for new patients",
    fields: [
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      { key: "address", label: "Home Address", type: "text", required: true },
      { key: "emergency_contact", label: "Emergency Contact Name & Phone", type: "text", required: true },
      { key: "medical_conditions", label: "Existing Medical Conditions", type: "textarea", required: true },
      { key: "current_medications", label: "Current Medications", type: "textarea", required: false },
      { key: "allergies", label: "Drug or Food Allergies", type: "textarea", required: true },
      { key: "insurance", label: "Insurance Provider & ID", type: "text", required: false },
      { key: "consent", label: "I consent to treatment and confirm information is accurate", type: "checkbox", required: true },
    ],
  },
  fitness: {
    name: "Fitness Client Intake Form",
    description: "Health and fitness information for new members",
    fields: [
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      { key: "fitness_goals", label: "Fitness Goals", type: "select", required: true, options: ["Weight Loss", "Muscle Gain", "Endurance", "Flexibility", "General Fitness"] },
      { key: "medical_conditions", label: "Any Medical Conditions or Injuries", type: "textarea", required: true },
      { key: "current_activity", label: "Current Activity Level", type: "select", required: true, options: ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"] },
      { key: "dietary_restrictions", label: "Dietary Restrictions or Preferences", type: "textarea", required: false },
      { key: "emergency_contact", label: "Emergency Contact Name & Phone", type: "text", required: true },
      { key: "consent", label: "I acknowledge the risks of physical activity and consent to training", type: "checkbox", required: true },
    ],
  },
  dental: {
    name: "Dental Patient Intake Form",
    description: "Required dental and medical history",
    fields: [
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      { key: "last_dental_visit", label: "Date of Last Dental Visit", type: "date", required: false },
      { key: "dental_concerns", label: "Current Dental Concerns", type: "textarea", required: true },
      { key: "medical_conditions", label: "Medical Conditions (diabetes, heart disease, etc.)", type: "textarea", required: true },
      { key: "medications", label: "Current Medications", type: "textarea", required: false },
      { key: "allergies", label: "Drug or Latex Allergies", type: "textarea", required: true },
      { key: "insurance", label: "Dental Insurance Provider & ID", type: "text", required: false },
      { key: "consent", label: "I consent to dental examination and treatment", type: "checkbox", required: true },
    ],
  },
  veterinary: {
    name: "Pet Registration Form",
    description: "Required information about your pet",
    fields: [
      { key: "pet_name", label: "Pet's Name", type: "text", required: true },
      { key: "species", label: "Species", type: "select", required: true, options: ["Dog", "Cat", "Bird", "Rabbit", "Reptile", "Other"] },
      { key: "breed", label: "Breed", type: "text", required: true },
      { key: "age", label: "Age (years)", type: "text", required: true },
      { key: "weight", label: "Weight (kg)", type: "text", required: false },
      { key: "medical_history", label: "Past Medical Issues or Surgeries", type: "textarea", required: false },
      { key: "allergies", label: "Known Allergies", type: "textarea", required: false },
      { key: "consent", label: "I consent to examination and treatment of my pet", type: "checkbox", required: true },
    ],
  },
  default: {
    name: "Client Intake Form",
    description: "Required information for new clients",
    fields: [
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
      { key: "address", label: "Home Address", type: "text", required: true },
      { key: "emergency_contact", label: "Emergency Contact Name & Phone", type: "text", required: true },
      { key: "allergies", label: "Any Allergies or Medical Conditions", type: "textarea", required: true },
      { key: "special_requests", label: "Special Requests or Concerns", type: "textarea", required: false },
      { key: "how_did_you_hear", label: "How did you hear about us?", type: "select", required: false, options: ["Google", "Social Media", "Friend/Family", "Walk-in", "Other"] },
      { key: "consent", label: "I agree to the terms and consent to service", type: "checkbox", required: true },
    ],
  },
}

const INVENTORY_FALLBACKS: Record<BusinessType, unknown[]> = {
  beauty: [
    { name: "Shampoo", sku: "SHP-001", quantity: 30, lowStockThreshold: 5, unit: "bottles" },
    { name: "Conditioner", sku: "CND-001", quantity: 30, lowStockThreshold: 5, unit: "bottles" },
    { name: "Hair Color", sku: "CLR-001", quantity: 40, lowStockThreshold: 8, unit: "tubes" },
    { name: "Nail Polish", sku: "NLP-001", quantity: 50, lowStockThreshold: 10, unit: "bottles" },
    { name: "Wax Strips", sku: "WAX-001", quantity: 20, lowStockThreshold: 5, unit: "boxes" },
    { name: "Disposable Gloves", sku: "GLV-001", quantity: 50, lowStockThreshold: 10, unit: "boxes" },
    { name: "Towels", sku: "TWL-001", quantity: 40, lowStockThreshold: 10, unit: "pieces" },
  ],
  medical: [
    { name: "Exam Gloves", sku: "GLV-001", quantity: 100, lowStockThreshold: 20, unit: "boxes" },
    { name: "Syringes", sku: "SYR-001", quantity: 200, lowStockThreshold: 50, unit: "units" },
    { name: "Bandages", sku: "BND-001", quantity: 50, lowStockThreshold: 10, unit: "rolls" },
    { name: "Antiseptic Solution", sku: "ANT-001", quantity: 30, lowStockThreshold: 5, unit: "bottles" },
    { name: "Face Masks", sku: "MSK-001", quantity: 50, lowStockThreshold: 10, unit: "boxes" },
    { name: "Cotton Swabs", sku: "CTN-001", quantity: 40, lowStockThreshold: 8, unit: "packs" },
  ],
  fitness: [
    { name: "Resistance Bands", sku: "RSB-001", quantity: 20, lowStockThreshold: 5, unit: "sets" },
    { name: "Yoga Mats", sku: "YGM-001", quantity: 15, lowStockThreshold: 3, unit: "pieces" },
    { name: "Sanitizer Spray", sku: "SAN-001", quantity: 30, lowStockThreshold: 5, unit: "bottles" },
    { name: "Towels", sku: "TWL-001", quantity: 50, lowStockThreshold: 10, unit: "pieces" },
    { name: "Protein Bars", sku: "PRB-001", quantity: 100, lowStockThreshold: 20, unit: "units" },
  ],
  dental: [
    { name: "Dental Gloves", sku: "GLV-001", quantity: 100, lowStockThreshold: 20, unit: "boxes" },
    { name: "Dental Bibs", sku: "BIB-001", quantity: 50, lowStockThreshold: 10, unit: "packs" },
    { name: "Composite Filling", sku: "FIL-001", quantity: 30, lowStockThreshold: 5, unit: "syringes" },
    { name: "Anesthetic Cartridges", sku: "ANE-001", quantity: 50, lowStockThreshold: 10, unit: "boxes" },
    { name: "Sterilization Pouches", sku: "STR-001", quantity: 40, lowStockThreshold: 8, unit: "packs" },
  ],
  veterinary: [
    { name: "Exam Gloves", sku: "GLV-001", quantity: 100, lowStockThreshold: 20, unit: "boxes" },
    { name: "Vaccines", sku: "VAC-001", quantity: 50, lowStockThreshold: 10, unit: "vials" },
    { name: "Flea Treatment", sku: "FLT-001", quantity: 30, lowStockThreshold: 5, unit: "doses" },
    { name: "Bandages", sku: "BND-001", quantity: 40, lowStockThreshold: 8, unit: "rolls" },
    { name: "Pet Shampoo", sku: "PSH-001", quantity: 20, lowStockThreshold: 5, unit: "bottles" },
  ],
  default: [
    { name: "Disposable Gloves", sku: "GLV-001", quantity: 100, lowStockThreshold: 20, unit: "boxes" },
    { name: "Sanitizer", sku: "SAN-001", quantity: 50, lowStockThreshold: 10, unit: "bottles" },
    { name: "Paper Towels", sku: "PTW-001", quantity: 30, lowStockThreshold: 5, unit: "rolls" },
    { name: "Face Masks", sku: "MSK-001", quantity: 50, lowStockThreshold: 10, unit: "boxes" },
    { name: "Cleaning Wipes", sku: "CLN-001", quantity: 40, lowStockThreshold: 8, unit: "packs" },
  ],
}

function getFallbacks(step: string, businessName: string) {
  const type = detectBusinessType(businessName)
  if (step === "booking-types") return BOOKING_FALLBACKS[type]
  if (step === "forms") return FORM_FALLBACKS[type]
  if (step === "inventory") return INVENTORY_FALLBACKS[type]
  return null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await apiRequireWorkspaceMember(workspaceId)

    const { step } = await request.json()

    if (!step || !PROMPTS[step as keyof typeof PROMPTS]) {
      return NextResponse.json(
        { error: "Invalid step. Must be one of: booking-types, forms, inventory" },
        { status: 400 }
      )
    }

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const systemPrompt = PROMPTS[step as keyof typeof PROMPTS]
    const userPrompt = `Business name: "${workspace.name}". Generate suggestions.`

    try {
      const result = await gemini.generateContent([systemPrompt, userPrompt])
      const text = result.response.text()

      const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0])
        return NextResponse.json({ suggestions })
      }
    } catch (err) {
      console.warn("AI suggest failed, using fallbacks:", err instanceof Error ? err.message : err)
    }

    return NextResponse.json({ suggestions: getFallbacks(step, workspace.name) })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("POST /api/workspaces/[id]/ai-suggest error:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
