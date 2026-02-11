"use client"

import { useEffect, useState } from "react"
import {
  Settings,
  Globe,
  Mail,
  Phone,
  CopyIcon,
  CheckIcon,
  MapPinIcon,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

interface ChannelAccount {
  id: string
  type: string
  provider: string
  fromAddress: string | null
  fromNumber: string | null
  isActive: boolean
}

interface WorkspaceData {
  id: string
  name: string
  slug: string
  status: string
  timezone: string | null
  address: string | null
  contactEmail: string | null
  channelAccounts: ChannelAccount[]
  bookingTypes: unknown[]
  members: unknown[]
  formDefinitions: unknown[]
  _count: { inventoryItems: number }
}

interface SettingsContentProps {
  workspaceId: string
}

export function SettingsContent({ workspaceId }: SettingsContentProps) {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`)
        if (res.ok) {
          const json = await res.json()
          setWorkspace(json)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchWorkspace()
  }, [workspaceId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Settings" description="Workspace configuration" />
        <SettingsSkeleton />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="space-y-6">
        <Header title="Settings" description="Workspace configuration" />
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Failed to load workspace settings.
        </div>
      </div>
    )
  }

  const bookingUrl = `${window.location.origin}/b/${workspace.slug}`

  function handleCopy() {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Header title="Settings" description="Workspace configuration" />

      <div className="grid gap-6">
        {/* Card 1: Workspace Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5 text-muted-foreground" />
              Workspace Details
            </CardTitle>
            <CardDescription>
              General workspace information (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{workspace.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Slug</p>
                <p className="text-sm font-mono">{workspace.slug}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <div>
                  <Badge
                    variant="outline"
                    className={
                      workspace.status === "ACTIVE"
                        ? "border-green-500 text-green-600"
                        : "border-yellow-500 text-yellow-600"
                    }
                  >
                    {workspace.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Timezone
                </p>
                <p className="text-sm">{workspace.timezone ?? "Not set"}</p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5" />
                  Address
                </p>
                <p className="text-sm">{workspace.address ?? "Not set"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  Contact Email
                </p>
                <p className="text-sm">{workspace.contactEmail ?? "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Communication Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5 text-muted-foreground" />
              Communication Channels
            </CardTitle>
            <CardDescription>
              Configured messaging channels (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workspace.channelAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No channels configured.
              </p>
            ) : (
              <div className="space-y-3">
                {workspace.channelAccounts.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {channel.type === "EMAIL" ? (
                        <Mail className="size-4 text-blue-500" />
                      ) : (
                        <Phone className="size-4 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {channel.type === "EMAIL"
                            ? channel.fromAddress
                            : channel.fromNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {channel.provider} &middot; {channel.type}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        channel.isActive
                          ? "border-green-500 text-green-600"
                          : "border-red-500 text-red-600"
                      }
                    >
                      {channel.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Workspace Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5 text-muted-foreground" />
              Workspace Status
            </CardTitle>
            <CardDescription>Current workspace state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={
                  workspace.status === "ACTIVE"
                    ? "border-green-500 text-green-600"
                    : "border-yellow-500 text-yellow-600"
                }
              >
                {workspace.status}
              </Badge>
              {workspace.status === "ACTIVE" && (
                <span className="text-sm text-green-600">
                  Your workspace is live
                </span>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Public Booking URL
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm">
                  {bookingUrl}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
