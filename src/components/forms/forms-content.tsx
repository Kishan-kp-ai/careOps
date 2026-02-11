"use client"

import { useCallback, useEffect, useState } from "react"
import {
  FileTextIcon,
  CheckCircle2,
  XCircle,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  SendIcon,
  Loader2Icon,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Header } from "@/components/layout/header"

interface FormField {
  key: string
  label: string
  type: string
  required?: boolean
}

interface FormDefinition {
  id: string
  name: string
  description: string | null
  fields: FormField[]
  isActive: boolean
}

interface PendingAssignment {
  id: string
  sentAt: string | null
  form: { name: string }
  booking: {
    publicToken: string
    startAt: string
    customer: { name: string; email: string | null; phone: string | null }
    bookingType: { name: string }
  }
}

interface FormsContentProps {
  workspaceId: string
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  textarea: "Text Area",
  number: "Number",
  email: "Email",
  phone: "Phone",
  date: "Date",
  select: "Select",
  checkbox: "Checkbox",
  radio: "Radio",
  file: "File Upload",
}

export function FormsContent({ workspaceId }: FormsContentProps) {
  const [forms, setForms] = useState<FormDefinition[]>([])
  const [pending, setPending] = useState<PendingAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set())
  const [resending, setResending] = useState<Set<string>>(new Set())

  const fetchForms = useCallback(async () => {
    try {
      const [formsRes, pendingRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/forms`),
        fetch(`/api/workspaces/${workspaceId}/forms/pending`),
      ])
      if (formsRes.ok) setForms(await formsRes.json())
      if (pendingRes.ok) setPending(await pendingRes.json())
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const handleResend = async (assignmentId: string) => {
    setResending((prev) => new Set(prev).add(assignmentId))
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/forms/pending/${assignmentId}/resend`,
        { method: "POST" }
      )
      if (res.ok) {
        toast.success("Form link resent successfully")
        setPending((prev) =>
          prev.map((p) =>
            p.id === assignmentId ? { ...p, sentAt: new Date().toISOString() } : p
          )
        )
      } else {
        toast.error("Failed to resend form link")
      }
    } catch {
      toast.error("Failed to resend form link")
    } finally {
      setResending((prev) => {
        const next = new Set(prev)
        next.delete(assignmentId)
        return next
      })
    }
  }

  const toggleExpanded = (formId: string) => {
    setExpandedForms((prev) => {
      const next = new Set(prev)
      if (next.has(formId)) {
        next.delete(formId)
      } else {
        next.add(formId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Forms" description="Manage form templates" />
        <FormsSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header title="Forms" description="Manage form templates" />

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="size-5 text-amber-500" />
              Pending Forms
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                {pending.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Forms that customers haven&apos;t submitted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.booking.customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.form.name} · {item.booking.bookingType.name}
                      </p>
                      {item.sentAt && (
                        <p className="text-xs text-muted-foreground">
                          Sent {formatDistanceToNow(new Date(item.sentAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resending.has(item.id)}
                    onClick={() => handleResend(item.id)}
                  >
                    {resending.has(item.id) ? (
                      <Loader2Icon className="mr-1 size-3 animate-spin" />
                    ) : (
                      <SendIcon className="mr-1 size-3" />
                    )}
                    Resend
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileTextIcon className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">
            No form templates yet. Create forms in onboarding or settings.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {forms.map((form) => {
            const fields = Array.isArray(form.fields) ? form.fields : []
            const isExpanded = expandedForms.has(form.id)

            return (
              <Card key={form.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileTextIcon className="size-4 text-muted-foreground" />
                        {form.name}
                      </CardTitle>
                      {form.description && (
                        <CardDescription>{form.description}</CardDescription>
                      )}
                    </div>
                    <Badge
                      variant={form.isActive ? "secondary" : "outline"}
                      className={
                        form.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "text-muted-foreground"
                      }
                    >
                      {form.isActive ? (
                        <CheckCircle2 className="mr-1 size-3" />
                      ) : (
                        <XCircle className="mr-1 size-3" />
                      )}
                      {form.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {fields.length} field{fields.length !== 1 ? "s" : ""}
                    </span>
                    {fields.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(form.id)}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="mr-1 size-4" />
                        ) : (
                          <ChevronRightIcon className="mr-1 size-4" />
                        )}
                        {isExpanded ? "Hide fields" : "Show fields"}
                      </Button>
                    )}
                  </div>

                  {isExpanded && fields.length > 0 && (
                    <div className="space-y-2 rounded-md border p-3">
                      {fields.map((field, idx) => (
                        <div
                          key={field.key || idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.label}</span>
                            {field.required && (
                              <Badge
                                variant="outline"
                                className="border-red-200 text-red-600 text-xs"
                              >
                                Required
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {FIELD_TYPE_LABELS[field.type] || field.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FormsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
