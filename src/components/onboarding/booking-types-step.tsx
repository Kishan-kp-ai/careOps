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
import { Trash2Icon, SparklesIcon, CheckIcon, Loader2Icon } from "lucide-react"

interface BookingType {
  id: string
  name: string
  description: string
  duration: number
}

interface AISuggestion {
  name: string
  description: string
  durationMin: number
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set())

  async function handleAiSuggest() {
    setAiLoading(true)
    setAiError("")
    setSuggestions([])
    setSelectedSuggestions(new Set())

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "booking-types" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate suggestions")
      }

      const data = await res.json()
      setSuggestions(data.suggestions)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAiLoading(false)
    }
  }

  function toggleSuggestion(index: number) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  async function handleAddSelected() {
    const selected = suggestions.filter((_, i) => selectedSuggestions.has(i))
    if (selected.length === 0) return

    setLoading(true)
    setError("")

    try {
      for (const s of selected) {
        const res = await fetch(`/api/workspaces/${workspaceId}/booking-types`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: s.name,
            description: s.description,
            durationMin: s.durationMin,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Failed to create "${s.name}"`)
        }

        const data = await res.json()
        setBookingTypes((prev) => [...prev, data])
      }

      setSuggestions([])
      setSelectedSuggestions(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

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
        <CardTitle>Services</CardTitle>
        <CardDescription>
          Define the types of appointments or services you offer.
          At least one is required to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="w-full gap-2"
        >
          {aiLoading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          {aiLoading ? "Generating suggestions..." : "Generate with AI"}
        </Button>

        {aiError && (
          <p className="text-destructive text-sm">{aiError}</p>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-medium">AI Suggestions — select the ones you want:</p>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleSuggestion(i)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selectedSuggestions.has(i)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    selectedSuggestions.has(i)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {selectedSuggestions.has(i) && <CheckIcon className="size-3" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {s.description}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {s.durationMin} min
                  </p>
                </div>
              </button>
            ))}
            <Button
              onClick={handleAddSelected}
              disabled={selectedSuggestions.size === 0 || loading}
              className="w-full"
            >
              {loading ? "Adding..." : `Add ${selectedSuggestions.size} selected`}
            </Button>
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium text-muted-foreground">Or add manually</p>
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
            <Label>Added Services</Label>
            {bookingTypes.map((bt) => (
              <div
                key={bt.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium text-sm">{bt.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {bt.duration} min
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
