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
import { Trash2Icon } from "lucide-react"

interface BookingType {
  id: string
  name: string
  description: string
  duration: number
  location: string
}

interface BookingTypesStepProps {
  workspaceId: string
  onComplete: () => void
}

export function BookingTypesStep({ workspaceId, onComplete }: BookingTypesStepProps) {
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("")
  const [location, setLocation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !duration) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/booking-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          durationMin: parseInt(duration),
          location,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create booking type")
      }

      const data = await res.json()
      setBookingTypes((prev) => [...prev, data])
      setName("")
      setDescription("")
      setDuration("")
      setLocation("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id: string) {
    setBookingTypes((prev) => prev.filter((bt) => bt.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Types</CardTitle>
        <CardDescription>
          Define the types of appointments or services you offer.
          At least one is required to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="bt-name">Name</Label>
            <Input
              id="bt-name"
              placeholder="Initial Consultation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bt-description">Description</Label>
            <Input
              id="bt-description"
              placeholder="First-time patient visit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bt-duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bt-location">Location</Label>
            <Input
              id="bt-location"
              placeholder="Room 101 / Virtual"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={!name.trim() || !duration || loading}
            className="w-full"
          >
            {loading ? "Adding..." : "Add Booking Type"}
          </Button>
        </form>

        {bookingTypes.length > 0 && (
          <div className="space-y-2">
            <Label>Added Booking Types</Label>
            {bookingTypes.map((bt) => (
              <div
                key={bt.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{bt.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {bt.duration} min{bt.location ? ` · ${bt.location}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDelete(bt.id)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={onComplete}
          disabled={bookingTypes.length === 0}
          className="w-full"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  )
}
