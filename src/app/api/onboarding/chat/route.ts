import { NextResponse } from "next/server"
import { gemini } from "@/lib/gemini"
import { apiAuth, ApiError } from "@/lib/auth-utils"

const SYSTEM_PROMPT = `You are a friendly onboarding assistant for CareOps, a workspace management platform.

Your job is to collect the following information to create a new workspace:
- name (business name) — REQUIRED
- address (business address) — OPTIONAL
- timezone (IANA timezone, e.g. "America/New_York") — REQUIRED
- contactEmail (contact email for the workspace) — REQUIRED

Rules:
1. Ask questions ONE AT A TIME in a conversational, natural tone.
2. Start by greeting the user warmly and asking for their business name.
3. After getting the name, ask about their location/address.
4. Based on the location they provide, infer the IANA timezone. If you cannot determine it confidently, ask them to confirm or clarify.
5. Then ask for their contact email address.
6. Be friendly, concise, and encouraging throughout.
7. If a user provides multiple pieces of information at once, acknowledge them and move to the next missing field.
8. Only after ALL required fields (name, timezone, contactEmail) have been collected, respond with a confirmation message summarizing the details AND append a JSON block in exactly this format:

###EXTRACTED###{"name":"...","address":"...","timezone":"...","contactEmail":"..."}###END###

The JSON must use valid IANA timezone identifiers. The address field can be an empty string if not provided. Only include the ###EXTRACTED### block when you have all required fields.
Do NOT use markdown formatting like ** in your responses. Keep it plain, natural text.
Do NOT repeat or duplicate your response. Reply only ONCE.`

interface ChatMessage {
  role: "assistant" | "user"
  content: string
}

export async function POST(request: Request) {
  try {
    await apiAuth()
    const body = await request.json()
    const { messages } = body as { messages: ChatMessage[] }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      )
    }

    // Build a single prompt with the full conversation context
    let prompt = SYSTEM_PROMPT + "\n\n--- Conversation so far ---\n"

    if (messages.length === 0) {
      prompt += "\n(No messages yet. Start with your greeting and first question.)"
    } else {
      for (const msg of messages) {
        prompt += `\n${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      }
      prompt += "\n\nAssistant:"
    }

    const result = await gemini.generateContent(prompt)
    const responseText = result.response.text()

    if (!responseText) {
      return NextResponse.json(
        { reply: "Hey there! Welcome to CareOps. Let's set up your workspace. What's the name of your business?" }
      )
    }

    let reply = responseText.trim()

    // Deduplicate if Gemini returned the same text twice
    const half = Math.floor(reply.length / 2)
    if (reply.length > 10 && reply.substring(0, half) === reply.substring(half)) {
      reply = reply.substring(0, half)
    }

    let extracted: {
      name: string
      address: string
      timezone: string
      contactEmail: string
    } | undefined

    const extractedMatch = reply.match(
      /###EXTRACTED###(\{[\s\S]*?\})###END###/
    )
    if (extractedMatch) {
      try {
        extracted = JSON.parse(extractedMatch[1])
      } catch {
        // ignore parse error
      }
      reply = reply.replace(/###EXTRACTED###[\s\S]*?###END###/, "").trim()
    }

    return NextResponse.json({ reply, extracted })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }
    console.error("POST /api/onboarding/chat error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
