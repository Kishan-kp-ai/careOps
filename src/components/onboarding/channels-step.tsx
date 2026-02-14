"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MailIcon, CheckCircle2Icon } from "lucide-react"

interface ChannelsStepProps {
  workspaceId: string
  onComplete: () => void
}

export function ChannelsStep({ workspaceId, onComplete }: ChannelsStepProps) {
  const searchParams = useSearchParams()
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [fromAddress, setFromAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [gmailConnected, setGmailConnected] = useState(
    searchParams.get("gmail") === "connected"
  )
  const [connectedEmail, setConnectedEmail] = useState("")
  const [showManualEmail, setShowManualEmail] = useState(false)

  useEffect(() => {
    const gmailParam = searchParams.get("gmail")

    if (gmailParam === "connected") {
      setGmailConnected(true)
      setEmailEnabled(true)
      fetch(`/api/workspaces/${workspaceId}/channels`)
        .then((res) => res.json())
        .then((data) => {
          const emailChannel = data.channels?.find(
            (ch: { type: string; provider?: string; fromAddress?: string }) =>
              ch.type === "EMAIL" && ch.provider === "google"
          )
          if (emailChannel?.fromAddress) {
            setConnectedEmail(emailChannel.fromAddress)
          }
        })
        .catch(() => {})
    } else if (gmailParam === "error") {
      setError("Failed to connect Gmail. Please try again.")
    }
  }, [searchParams, workspaceId])

  const hasChannel = emailEnabled
  const isValid =
    hasChannel &&
    (!emailEnabled || gmailConnected || fromAddress.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const channels = []
      if (emailEnabled && !gmailConnected) {
        channels.push({ type: "EMAIL", fromAddress })
      }
      if (channels.length > 0) {
        const res = await fetch(`/api/workspaces/${workspaceId}/channels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channels }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to save channels")
        }
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleConnectGmail() {
    window.location.href = `/api/oauth/google/initiate?workspaceId=${workspaceId}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Channels</CardTitle>
        <CardDescription>
          Set up how you&apos;ll communicate with clients. At least one channel
          is required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-toggle" className="text-base">
                  Email
                </Label>
                <p className="text-muted-foreground text-sm">
                  Send booking confirmations and reminders via email
                </p>
              </div>
              <Switch
                id="email-toggle"
                checked={emailEnabled}
                onCheckedChange={(checked) => {
                  setEmailEnabled(checked)
                  if (!checked) {
                    setShowManualEmail(false)
                  }
                }}
              />
            </div>
            {emailEnabled && (
              <div className="space-y-3">
                {gmailConnected ? (
                  <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">
                        Connected as {connectedEmail || "Gmail"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleConnectGmail}
                    >
                      Reconnect
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleConnectGmail}
                    >
                      <MailIcon className="mr-2 h-4 w-4" />
                      Connect Gmail
                    </Button>
                    {!showManualEmail ? (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground text-sm underline"
                        onClick={() => setShowManualEmail(true)}
                      >
                        Or enter email manually
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="fromAddress">From Address</Label>
                        <Input
                          id="fromAddress"
                          type="email"
                          placeholder="noreply@acmehealth.com"
                          value={fromAddress}
                          onChange={(e) => setFromAddress(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {!hasChannel && (
            <p className="text-destructive text-sm">
              At least one channel is required to proceed.
            </p>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={!isValid || loading}
            className="w-full"
          >
            {loading ? "Saving..." : "Save Channels"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
