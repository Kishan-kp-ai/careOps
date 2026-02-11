import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { apiAuth, ApiError } from "@/lib/auth-utils"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(`${baseUrl}/onboarding?gmail=error`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/onboarding?gmail=error`)
    }

    const cookieStore = await cookies()
    const savedState = cookieStore.get("google_oauth_state")?.value

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${baseUrl}/onboarding?gmail=error`)
    }

    const { workspaceId, userId } = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8")
    )

    const user = await apiAuth()
    if (user.id !== userId) {
      return NextResponse.redirect(`${baseUrl}/onboarding?gmail=error`)
    }

    const redirectUri = `${baseUrl}/api/oauth/google/callback`

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/onboarding?gmail=error`)
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in, scope, token_type } = tokens

    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/onboarding?gmail=error`)
    }

    const userInfo = await userInfoResponse.json()
    const email = userInfo.email as string

    const existing = await db.channelAccount.findFirst({
      where: { workspaceId, type: "EMAIL" },
    })

    const config = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      email,
      scope,
      tokenType: token_type,
    }

    if (existing) {
      if (!config.refreshToken) {
        const existingConfig = existing.config as Record<string, unknown> | null
        config.refreshToken = existingConfig?.refreshToken as string | undefined
      }

      await db.channelAccount.update({
        where: { id: existing.id },
        data: {
          provider: "google",
          fromAddress: email,
          isActive: true,
          config,
        },
      })
    } else {
      await db.channelAccount.create({
        data: {
          workspaceId,
          type: "EMAIL",
          provider: "google",
          fromAddress: email,
          isActive: true,
          config,
        },
      })
    }

    cookieStore.delete("google_oauth_state")

    return NextResponse.redirect(`${baseUrl}/onboarding?gmail=connected&workspaceId=${workspaceId}`)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.redirect(`${baseUrl}/onboarding?gmail=error`)
  }
}
