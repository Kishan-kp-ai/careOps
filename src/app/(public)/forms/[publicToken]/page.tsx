"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2Icon, FileTextIcon, Loader2Icon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FormField {
  name: string
  label: string
  type: "text" | "date" | "tel" | "email" | "textarea" | "checkbox" | "select"
  required?: boolean
  options?: string[]
}

interface FormAssignment {
  id: string
  form: {
    id: string
    name: string
    description: string | null
    fields: FormField[] | string
  }
  submission: unknown | null
}

export default function PublicFormsPage() {
  const { publicToken } = useParams<{ publicToken: string }>()
  const [assignments, setAssignments] = useState<FormAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [formData, setFormData] = useState<Record<string, Record<string, unknown>>>({})
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchForms() {
      try {
        const res = await fetch(`/api/public/forms/${publicToken}`)
        if (!res.ok) {
          setError(true)
          return
        }
        const data: FormAssignment[] = await res.json()
        setAssignments(data)

        const alreadySubmitted = new Set<string>()
        data.forEach((a) => {
          if (a.submission) alreadySubmitted.add(a.id)
        })
        setSubmitted(alreadySubmitted)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchForms()
  }, [publicToken])

  function getFields(assignment: FormAssignment): FormField[] {
    const fields = assignment.form.fields
    if (typeof fields === "string") return JSON.parse(fields)
    return fields as FormField[]
  }

  function updateField(assignmentId: string, fieldName: string, value: unknown) {
    setFormData((prev) => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [fieldName]: value,
      },
    }))
  }

  async function handleSubmit(assignmentId: string) {
    setSubmitting((prev) => ({ ...prev, [assignmentId]: true }))
    try {
      const res = await fetch(`/api/public/forms/${publicToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          data: formData[assignmentId] || {},
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        toast.error(body?.error || "Failed to submit form")
        return
      }
      toast.success("Form submitted successfully")
      setSubmitted((prev) => new Set(prev).add(assignmentId))
    } catch {
      toast.error("Failed to submit form")
    } finally {
      setSubmitting((prev) => ({ ...prev, [assignmentId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-8">
        <Skeleton className="mx-auto h-8 w-48" />
        <Card className="w-full">
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Forms not found
        </h1>
        <p className="mt-2 text-gray-500">
          The forms you are looking for do not exist or are no longer available.
        </p>
      </div>
    )
  }

  const allCompleted = assignments.every((a) => submitted.has(a.id))

  if (allCompleted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle2Icon className="size-16 text-green-500" />
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">
          All forms completed
        </h1>
        <p className="mt-2 text-gray-500">
          Thank you! All required forms have been submitted.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {assignments.map((assignment) => {
        const fields = getFields(assignment)
        const isSubmitted = submitted.has(assignment.id)
        const isSubmitting = submitting[assignment.id]

        if (isSubmitted) {
          return (
            <Card key={assignment.id} className="w-full">
              <CardContent className="flex items-center gap-3 py-6">
                <CheckCircle2Icon className="size-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {assignment.form.name}
                  </p>
                  <p className="text-sm text-green-600">Submitted</p>
                </div>
              </CardContent>
            </Card>
          )
        }

        return (
          <Card key={assignment.id} className="w-full">
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {assignment.form.name}
                </h2>
              </div>
              {assignment.form.description && (
                <p className="text-sm text-gray-500">
                  {assignment.form.description}
                </p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit(assignment.id)
                }}
                className="flex flex-col gap-4"
              >
                {fields.map((field) => (
                  <div key={field.name} className="flex flex-col gap-2">
                    {field.type === "checkbox" ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${assignment.id}-${field.name}`}
                          required={field.required}
                          checked={
                            (formData[assignment.id]?.[field.name] as boolean) ||
                            false
                          }
                          onCheckedChange={(checked) =>
                            updateField(
                              assignment.id,
                              field.name,
                              checked === true
                            )
                          }
                        />
                        <Label htmlFor={`${assignment.id}-${field.name}`}>
                          {field.label}
                          {field.required && (
                            <span className="ml-0.5 text-red-500">*</span>
                          )}
                        </Label>
                      </div>
                    ) : (
                      <>
                        <Label htmlFor={`${assignment.id}-${field.name}`}>
                          {field.label}
                          {field.required && (
                            <span className="ml-0.5 text-red-500">*</span>
                          )}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={`${assignment.id}-${field.name}`}
                            required={field.required}
                            value={
                              (formData[assignment.id]?.[
                                field.name
                              ] as string) || ""
                            }
                            onChange={(e) =>
                              updateField(
                                assignment.id,
                                field.name,
                                e.target.value
                              )
                            }
                          />
                        ) : field.type === "select" ? (
                          <Select
                            required={field.required}
                            value={
                              (formData[assignment.id]?.[
                                field.name
                              ] as string) || ""
                            }
                            onValueChange={(value) =>
                              updateField(assignment.id, field.name, value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={`${assignment.id}-${field.name}`}
                            type={field.type}
                            required={field.required}
                            value={
                              (formData[assignment.id]?.[
                                field.name
                              ] as string) || ""
                            }
                            onChange={(e) =>
                              updateField(
                                assignment.id,
                                field.name,
                                e.target.value
                              )
                            }
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 w-full text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2Icon className="size-4 animate-spin" />
                  )}
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
