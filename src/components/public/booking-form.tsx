"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  } from "lucide-react"
import { format, setHours, setMinutes, addMinutes, isBefore } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BookingType {
  id: string
  name: string
  description: string | null
  durationMin: number
  availability: any
}

interface BookingFormProps {
  workspace: {
    id: string
    name: string
    slug: string
    address: string | null
  }
  bookingTypes: BookingType[]
}

function generateTimeSlots(durationMin: number): string[] {
  const slots: string[] = []
  let current = setMinutes(setHours(new Date(), 9), 0)
  const end = setMinutes(setHours(new Date(), 17), 0)

  while (isBefore(current, end)) {
    const slotEnd = addMinutes(current, durationMin)
    if (isBefore(slotEnd, end) || slotEnd.getTime() === end.getTime()) {
      slots.push(format(current, "HH:mm"))
    }
    current = addMinutes(current, durationMin)
  }

  return slots
}

export function BookingForm({ workspace, bookingTypes }: BookingFormProps) {
  const [selectedTypeId, setSelectedTypeId] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState("")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [bookingResult, setBookingResult] = useState<{
    formsUrl?: string
    publicToken?: string
  } | null>(null)

  const selectedType = bookingTypes.find((t) => t.id === selectedTypeId)

  const timeSlots = useMemo(() => {
    if (!selectedType) return []
    return generateTimeSlots(selectedType.durationMin)
  }, [selectedType])

  useEffect(() => {
    if (!selectedType || !selectedDate) {
      setBookedSlots([])
      return
    }

    async function fetchBookedSlots() {
      try {
        const params = new URLSearchParams({
          workspaceSlug: workspace.slug,
          bookingTypeId: selectedType!.id,
          date: format(selectedDate!, "yyyy-MM-dd"),
        })
        const res = await fetch(`/api/public/booking/slots?${params}`)
        if (res.ok) {
          const data = await res.json()
          setBookedSlots(data.bookedSlots || [])
        }
      } catch {
        setBookedSlots([])
      }
    }

    fetchBookedSlots()
  }, [selectedType, selectedDate, workspace.slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType || !selectedDate || !selectedTime) return

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug: workspace.slug,
          bookingTypeId: selectedType.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          name,
          email,
          phone: phone || undefined,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Something went wrong")
      }

      const data = await res.json()
      setBookingResult(data)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted && selectedType && selectedDate) {
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const startAt = new Date(selectedDate)
    startAt.setHours(hours, minutes, 0, 0)

    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2Icon className="size-12 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed</h2>
        <p className="text-gray-500">
          Your appointment has been booked successfully.
        </p>

        <Card className="mt-4 w-full max-w-sm text-left">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <CalendarIcon className="size-4 text-gray-500" />
              {format(startAt, "EEEE, MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <ClockIcon className="size-4 text-gray-500" />
              {format(startAt, "h:mm a")} &middot; {selectedType.durationMin}{" "}
              min
            </div>
            {workspace.address && (
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <MapPinIcon className="size-4 text-gray-500" />
                {workspace.address}
              </div>
            )}
            <div className="text-sm font-medium text-gray-900">
              {selectedType.name}
            </div>
          </CardContent>
        </Card>

        <Button asChild variant="outline" className="mt-2">
          <Link href={`/b/${workspace.slug}`}>
            <ArrowLeftIcon className="size-4" />
            Back to {workspace.name}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/b/${workspace.slug}`}>
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Book an Appointment
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select a Service</CardTitle>
            <CardDescription>
              Choose the type of appointment you&apos;d like to book.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {bookingTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setSelectedTypeId(type.id)
                    setSelectedTime("")
                  }}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                    selectedTypeId === type.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-gray-400"
                  )}
                >
                  <span className="text-sm font-medium text-gray-900">
                    {type.name}
                  </span>
                  {type.description && (
                    <span className="text-sm text-gray-500">
                      {type.description}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      <ClockIcon className="size-3" />
                      {type.durationMin} min
                    </Badge>
                    {workspace.address && (
                      <Badge variant="secondary">
                        <MapPinIcon className="size-3" />
                        {workspace.address}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedType && (
          <Card>
            <CardHeader>
              <CardTitle>Pick a Date & Time</CardTitle>
              <CardDescription>
                Select your preferred date and time slot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    setSelectedTime("")
                  }}
                  disabled={{ before: new Date() }}
                  className="rounded-md border"
                />

                {selectedDate && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {format(selectedDate, "EEEE, MMMM d")}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {timeSlots.map((slot) => {
                        const isBooked = bookedSlots.includes(slot)
                        return (
                          <Button
                            key={slot}
                            type="button"
                            variant={
                              selectedTime === slot ? "default" : isBooked ? "ghost" : "outline"
                            }
                            size="sm"
                            onClick={() => setSelectedTime(slot)}
                            disabled={isBooked}
                            className={isBooked ? "line-through opacity-50" : ""}
                          >
                            {format(
                              setMinutes(
                                setHours(new Date(), parseInt(slot.split(":")[0])),
                                parseInt(slot.split(":")[1])
                              ),
                              "h:mm a"
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedType && selectedDate && selectedTime && (
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <CardDescription>
                Please provide your contact details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything we should know?"
                    rows={3}
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? "Booking..." : "Confirm Booking"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  )
}
