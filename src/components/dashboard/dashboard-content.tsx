"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  Clock,
  UserPlus,
  FileText,
  AlertTriangle,
  Package,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

interface DashboardData {
  bookings: {
    today: number
    upcoming: number
    completed: number
    noShow: number
  }
  leads: {
    new: number
    total: number
    unanswered: number
  }
  forms: {
    pending: number
    overdue: number
    completed: number
  }
  inventory: {
    lowStock: {
      id: string
      name: string
      quantity: number
      lowStockThreshold: number
      unit: string
    }[]
  }
}

interface DashboardContentProps {
  workspaceId: string
  slug: string
}

export function DashboardContent({ workspaceId, slug }: DashboardContentProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/dashboard`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [workspaceId])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Failed to load dashboard data.
      </div>
    )
  }

  const totalBookings = data.bookings.completed + data.bookings.noShow
  const completionRate =
    totalBookings > 0
      ? Math.round((data.bookings.completed / totalBookings) * 100)
      : 0

  const alerts = buildAlerts(data, slug)

  return (
    <div className="space-y-6">
      {/* Row 1: Stat Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Bookings"
          value={data.bookings.today}
          icon={<Calendar className="size-5 text-blue-500" />}
        />
        <StatCard
          title="Upcoming Bookings"
          value={data.bookings.upcoming}
          icon={<Clock className="size-5 text-indigo-500" />}
          description="Next 7 days"
        />
        <StatCard
          title="New Leads"
          value={data.leads.new}
          icon={<UserPlus className="size-5 text-green-500" />}
        />
        <StatCard
          title="Pending Forms"
          value={data.forms.pending}
          icon={<FileText className="size-5 text-amber-500" />}
          alert={data.forms.overdue > 0}
          alertText={`${data.forms.overdue} overdue`}
        />
      </div>

      {/* Row 2: Booking Overview & Leads */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking Overview</CardTitle>
            <CardDescription>Completed vs no-show breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span>Completed</span>
              </div>
              <span className="font-semibold">{data.bookings.completed}</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-red-500" />
                <span>No-show</span>
              </div>
              <span className="font-semibold">{data.bookings.noShow}</span>
            </div>
            <Progress
              value={totalBookings > 0 ? 100 - completionRate : 0}
              className="h-2 [&>[data-slot=progress-indicator]]:bg-red-500"
            />
            <p className="text-xs text-muted-foreground">
              {completionRate}% completion rate across {totalBookings} total
              bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads & Conversations</CardTitle>
            <CardDescription>Current lead activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <UserPlus className="size-4 text-green-500" />
                <span>New inquiries</span>
              </div>
              <span className="font-semibold">{data.leads.new}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-amber-500" />
                <span>Unanswered messages</span>
              </div>
              <Badge
                variant={data.leads.unanswered > 0 ? "destructive" : "secondary"}
              >
                {data.leads.unanswered}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="size-4 text-blue-500" />
                <span>Total leads</span>
              </div>
              <span className="font-semibold">{data.leads.total}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Forms Status & Inventory Alerts */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Forms Status</CardTitle>
            <CardDescription>Form assignments overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending</span>
              <Badge
                variant={data.forms.pending > 0 ? "outline" : "secondary"}
                className={
                  data.forms.pending > 0
                    ? "border-amber-500 text-amber-600"
                    : ""
                }
              >
                {data.forms.pending}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Overdue</span>
              <Badge
                variant={data.forms.overdue > 0 ? "destructive" : "secondary"}
              >
                {data.forms.overdue}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed</span>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              >
                {data.forms.completed}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
            <CardDescription>
              {data.inventory.lowStock.length > 0
                ? `${data.inventory.lowStock.length} item${data.inventory.lowStock.length > 1 ? "s" : ""} low on stock`
                : "All items sufficiently stocked"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.inventory.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No inventory alerts at this time.
              </p>
            ) : (
              <div className="space-y-3">
                {data.inventory.lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="size-4 text-muted-foreground" />
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} / {item.lowStockThreshold} {item.unit}
                      </span>
                      <Badge
                        variant="destructive"
                        className={
                          item.quantity === 0
                            ? ""
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        }
                      >
                        {item.quantity === 0 ? "Out of stock" : "Low"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Key Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Key Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Link
                  key={i}
                  href={alert.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                  <span>{alert.message}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  description,
  alert,
  alertText,
}: {
  title: string
  value: number
  icon: React.ReactNode
  description?: string
  alert?: boolean
  alertText?: string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {alert && alertText && (
          <p className="mt-1 text-xs text-red-500">{alertText}</p>
        )}
      </CardContent>
    </Card>
  )
}

function buildAlerts(data: DashboardData, slug: string) {
  const alerts: { message: string; href: string }[] = []

  if (data.bookings.upcoming > 0) {
    alerts.push({
      message: `${data.bookings.upcoming} unconfirmed bookings in the next 7 days`,
      href: `/w/${slug}/bookings`,
    })
  }

  if (data.leads.unanswered > 0) {
    alerts.push({
      message: `${data.leads.unanswered} unanswered messages`,
      href: `/w/${slug}/inbox`,
    })
  }

  if (data.forms.overdue > 0) {
    alerts.push({
      message: `${data.forms.overdue} overdue forms`,
      href: `/w/${slug}/forms`,
    })
  }

  if (data.inventory.lowStock.length > 0) {
    alerts.push({
      message: `${data.inventory.lowStock.length} item${data.inventory.lowStock.length > 1 ? "s" : ""} below stock threshold`,
      href: `/w/${slug}/inventory`,
    })
  }

  return alerts
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-5 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}
