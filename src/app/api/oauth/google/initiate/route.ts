import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { apiAuth, ApiError } from "@/lib/auth-utils"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const user = await apiAuth()

    const { searchParams } = request.nextUrl
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const statePayload = JSON.stringify({
      nonce: uuidv4(),
      workspaceId,
      userId: user.id,
    })
    const state = Buffer.from(statePayload).toString("base64")

    const cookieStore = await cookies()
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    })

    const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oauth/google/callback`

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    })

    return NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/onboarding?gmail=error`
    )
  }
}
