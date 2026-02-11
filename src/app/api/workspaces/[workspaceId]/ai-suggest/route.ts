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

    const result = await gemini.generateContent([systemPrompt, userPrompt])
    const text = result.response.text()

    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      )
    }

    const suggestions = JSON.parse(jsonMatch[0])

    return NextResponse.json({ suggestions })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("POST /api/workspaces/[id]/ai-suggest error:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
