"use client"

import { useCallback, useEffect, useState } from "react"
import {
  FileTextIcon,
  CheckCircle2,
  XCircle,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set())

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/forms`)
      if (res.ok) {
        setForms(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

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
