"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { format, isAfter } from "date-fns"
import {
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  CheckIcon,
  MoreHorizontalIcon,
  XCircleIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  CalendarOffIcon,
} from "lucide-react"
import type { BookingStatus } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"

interface BookingWithRelations {
  id: string
  status: BookingStatus
  startAt: string
  endAt: string
  notes: string | null
  customer: { id: string; name: string; email: string | null; phone: string | null }
  bookingType: { id: string; name: string; durationMin: number }
}

interface BookingsContentProps {
  workspaceId: string
  workspaceSlug: string
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  REQUESTED: { label: "Requested", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  CONFIRMED: { label: "Confirmed", className: "bg-blue-100 text-blue-800 border-blue-200" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200" },
  NO_SHOW: { label: "No-Show", className: "bg-red-100 text-red-800 border-red-200" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-800 border-gray-200" },
}

type TabValue = "all" | "upcoming" | "confirmed" | "completed" | "no_show" | "cancelled"

export function BookingsContent({ workspaceId, workspaceSlug }: BookingsContentProps) {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<TabValue>("all")

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/bookings`)
      if (res.ok) {
        setBookings(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const updateStatus = async (bookingId: string, status: BookingStatus) => {
    const res = await fetch(`/api/workspaces/${workspaceId}/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      fetchBookings()
    }
  }

  const copyPublicLink = () => {
    const url = `${window.location.origin}/book/${workspaceSlug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = bookings.filter((b) => {
    switch (activeTab) {
      case "upcoming":
        return (
          (b.status === "REQUESTED" || b.status === "CONFIRMED") &&
          isAfter(new Date(b.startAt), new Date())
        )
      case "confirmed":
        return b.status === "CONFIRMED"
      case "completed":
        return b.status === "COMPLETED"
      case "no_show":
        return b.status === "NO_SHOW"
      case "cancelled":
        return b.status === "CANCELLED"
      default:
        return true
    }
  })

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground text-sm">Loading bookings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="no_show">No-Show</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={copyPublicLink}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy Booking Link"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarOffIcon className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">No bookings found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.customer.name}</div>
                        {booking.customer.email && (
                          <div className="text-muted-foreground text-xs">
                            {booking.customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{booking.bookingType.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="text-muted-foreground size-3.5" />
                        <span>{format(new Date(booking.startAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <ClockIcon className="size-3" />
                        <span>{format(new Date(booking.startAt), "h:mm a")}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(booking.bookingType.durationMin)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[booking.status].className}>
                        {STATUS_CONFIG[booking.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ActionsMenu
                        booking={booking}
                        workspaceSlug={workspaceSlug}
                        onStatusChange={updateStatus}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{booking.customer.name}</div>
                      <div className="text-muted-foreground text-sm">
                        {booking.bookingType.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_CONFIG[booking.status].className}>
                        {STATUS_CONFIG[booking.status].label}
                      </Badge>
                      <ActionsMenu
                        booking={booking}
                        workspaceSlug={workspaceSlug}
                        onStatusChange={updateStatus}
                      />
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {format(new Date(booking.startAt), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {format(new Date(booking.startAt), "h:mm a")}
                    </div>
                    <span>{formatDuration(booking.bookingType.durationMin)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ActionsMenu({
  booking,
  workspaceSlug,
  onStatusChange,
}: {
  booking: BookingWithRelations
  workspaceSlug: string
  onStatusChange: (bookingId: string, status: BookingStatus) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {booking.status === "REQUESTED" && (
          <DropdownMenuItem onClick={() => onStatusChange(booking.id, "CONFIRMED")}>
            <CheckCircleIcon className="text-blue-600" />
            Confirm
          </DropdownMenuItem>
        )}
        {booking.status === "CONFIRMED" && (
          <>
            <DropdownMenuItem onClick={() => onStatusChange(booking.id, "COMPLETED")}>
              <CheckCircleIcon className="text-green-600" />
              Complete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(booking.id, "NO_SHOW")}>
              <AlertCircleIcon className="text-red-600" />
              No-Show
            </DropdownMenuItem>
          </>
        )}
        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
          <DropdownMenuItem onClick={() => onStatusChange(booking.id, "CANCELLED")}>
            <XCircleIcon className="text-gray-600" />
            Cancel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/w/${workspaceSlug}/bookings/${booking.id}`}>
            <EyeIcon />
            View Details
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
