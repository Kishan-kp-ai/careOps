"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CheckCircle2Icon, CircleIcon, LoaderIcon } from "lucide-react"

interface WorkspaceDetails {
  name: string
  slug: string
  hasChannels: boolean
  hasBookingTypes: boolean
  hasForms: boolean
  hasInventory: boolean
  hasStaff: boolean
}

interface ActivateStepProps {
  workspaceId: string
  onActivate: () => void
}

export function ActivateStep({ workspaceId, onActivate }: ActivateStepProps) {
  const [details, setDetails] = useState<WorkspaceDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}`)
        if (!res.ok) throw new Error("Failed to fetch workspace details")
        const data = await res.json()
        setDetails({
          name: data.name,
          slug: data.slug,
          hasChannels: (data.channelAccounts?.length ?? 0) > 0,
          hasBookingTypes: (data.bookingTypes?.length ?? 0) > 0,
          hasForms: (data.formDefinitions?.length ?? 0) > 0,
          hasInventory: (data._count?.inventoryItems ?? 0) > 0,
          hasStaff: (data.members?.length ?? 0) > 1,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [workspaceId])

  async function handleActivate() {
    setActivating(true)
    setError("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/activate`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to activate workspace")
      }

      onActivate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setActivating(false)
    }
  }

  const requiredReady = details
    ? details.hasChannels && details.hasBookingTypes
    : false

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review &amp; Activate</CardTitle>
        <CardDescription>
          Review your workspace setup and activate when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : details ? (
          <>
            <div className="space-y-3">
              <ChecklistItem checked label="Workspace created" />
              <ChecklistItem
                checked={details.hasChannels}
                label="Communication channel set up"
              />
              <ChecklistItem
                checked={details.hasBookingTypes}
                label="Booking type created"
              />
              <ChecklistItem
                checked={details.hasForms}
                label="Forms configured"
                optional
              />
              <ChecklistItem
                checked={details.hasInventory}
                label="Inventory set up"
                optional
              />
              <ChecklistItem
                checked={details.hasStaff}
                label="Staff invited"
                optional
              />
            </div>

            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-sm font-medium">Public Booking URL</p>
              <p className="text-muted-foreground text-sm break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/book/
                {details.slug}
              </p>
            </div>

            {!requiredReady && (
              <p className="text-destructive text-sm">
                Please complete all required steps (channels and booking types)
                before activating.
              </p>
            )}

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <Button
              onClick={handleActivate}
              disabled={!requiredReady || activating}
              className="w-full"
              size="lg"
            >
              {activating ? "Activating..." : "Activate Workspace"}
            </Button>
          </>
        ) : (
          <p className="text-destructive text-sm">
            {error || "Failed to load workspace details."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ChecklistItem({
  checked,
  label,
  optional,
}: {
  checked: boolean
  label: string
  optional?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      {checked ? (
        <CheckCircle2Icon className="size-5 text-green-600" />
      ) : (
        <CircleIcon className="text-muted-foreground size-5" />
      )}
      <span className="text-sm">
        {label}
        {optional && (
          <span className="text-muted-foreground ml-1">(optional)</span>
        )}
      </span>
    </div>
  )
}
