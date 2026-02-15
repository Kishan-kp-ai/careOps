"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

interface Service {
  id: string
  name: string
  description: string | null
  durationMin: number
  location: string | null
  isActive: boolean
}

interface ServicesContentProps {
  workspaceId: string
}

export function ServicesContent({ workspaceId }: ServicesContentProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [durationMin, setDurationMin] = useState("60")
  const [location, setLocation] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/booking-types`)
      if (res.ok) {
        setServices(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/booking-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          durationMin: parseInt(durationMin),
          location: location || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add service")
      }

      setName("")
      setDescription("")
      setDurationMin("60")
      setLocation("")
      setShowForm(false)
      fetchServices()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground text-sm">Loading services...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          <PlusIcon className="size-4" />
          Add Service
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Service</CardTitle>
            <CardDescription>Add a new service that customers can book.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-name">Name *</Label>
                <Input
                  id="service-name"
                  placeholder="e.g. General Consultation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-desc">Description</Label>
                <Input
                  id="service-desc"
                  placeholder="Brief description of the service"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-duration">Duration</Label>
                  <Select value={durationMin} onValueChange={setDurationMin}>
                    <SelectTrigger id="service-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1h 30m</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-location">Location</Label>
                  <Input
                    id="service-location"
                    placeholder="e.g. Room 101"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={!name.trim() || saving}>
                  {saving ? "Adding..." : "Add Service"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">No services added yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Click &quot;Add Service&quot; to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{service.name}</h3>
                    {service.description && (
                      <p className="text-muted-foreground text-sm">
                        {service.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={service.isActive ? "default" : "secondary"}>
                    {service.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="size-3.5" />
                    {formatDuration(service.durationMin)}
                  </div>
                  {service.location && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="size-3.5" />
                      {service.location}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
