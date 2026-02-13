"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
]

interface WorkspaceStepProps {
  onComplete: (workspaceId: string, slug: string) => void
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function WorkspaceStep({ onComplete }: WorkspaceStepProps) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [address, setAddress] = useState("")
  const [timezone, setTimezone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [slugNotice, setSlugNotice] = useState("")

  function handleNameChange(value: string) {
    setName(value)
    setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSlugNotice("")

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, address, timezone, contactEmail }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create workspace")
      }

      const data = await res.json()

      if (data.slug !== slug) {
        setSlugNotice(
          `Slug "${slug}" was taken. Your workspace was created with slug "${data.slug}".`
        )
      }

      onComplete(data.id, data.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const isValid = name.trim() && slug.trim() && timezone && contactEmail.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Workspace</CardTitle>
        <CardDescription>
          Set up your business workspace. This is where you&apos;ll manage
          bookings, staff, and communications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              placeholder="Acme Health Clinic"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="acme-health-clinic"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">
              Used in your public booking URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="hello@acmehealth.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {slugNotice && (
            <p className="text-sm text-amber-600">{slugNotice}</p>
          )}

          <Button type="submit" disabled={!isValid || loading} className="w-full">
            {loading ? "Creating..." : "Create Workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
