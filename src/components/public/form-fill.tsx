"use client"

import { useState } from "react"
import { CheckCircle2Icon, FileTextIcon } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

type FormField = {
  name: string
  label: string
  type: "text" | "textarea" | "select" | "checkbox"
  required?: boolean
  options?: string[]
}

type FormAssignment = {
  assignmentId: string
  status: string
  form: {
    id: string
    name: string
    description: string | null
    fields: FormField[]
  }
}

interface FormFillProps {
  publicToken: string
  forms: FormAssignment[]
}

export function FormFill({ publicToken, forms }: FormFillProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const f of forms) {
      initial[f.assignmentId] = f.status
    }
    return initial
  })

  const [formData, setFormData] = useState<Record<string, Record<string, any>>>(
    () => {
      const initial: Record<string, Record<string, any>> = {}
      for (const f of forms) {
        initial[f.assignmentId] = {}
      }
      return initial
    }
  )

  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<
    Record<string, Set<string>>
  >({})

  function updateField(assignmentId: string, fieldName: string, value: any) {
    setFormData((prev) => ({
      ...prev,
      [assignmentId]: { ...prev[assignmentId], [fieldName]: value },
    }))
    setValidationErrors((prev) => {
      const next = { ...prev }
      if (next[assignmentId]) {
        const updated = new Set(next[assignmentId])
        updated.delete(fieldName)
        next[assignmentId] = updated
      }
      return next
    })
  }

  function validate(assignment: FormAssignment): boolean {
    const data = formData[assignment.assignmentId] || {}
    const missing = new Set<string>()

    for (const field of assignment.form.fields) {
      if (!field.required) continue
      const value = data[field.name]
      if (field.type === "checkbox") {
        if (!value) missing.add(field.name)
      } else {
        if (!value || (typeof value === "string" && !value.trim())) {
          missing.add(field.name)
        }
      }
    }

    if (missing.size > 0) {
      setValidationErrors((prev) => ({ ...prev, [assignment.assignmentId]: missing }))
      return false
    }

    return true
  }

  async function handleSubmit(assignment: FormAssignment) {
    if (!validate(assignment)) return

    const assignmentId = assignment.assignmentId
    setSubmitting((prev) => ({ ...prev, [assignmentId]: true }))
    setErrors((prev) => ({ ...prev, [assignmentId]: "" }))

    try {
      const res = await fetch(`/api/public/forms/${publicToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          data: formData[assignmentId],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Something went wrong")
      }

      setStatuses((prev) => ({ ...prev, [assignmentId]: "submitted" }))
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [assignmentId]: err instanceof Error ? err.message : "Something went wrong",
      }))
    } finally {
      setSubmitting((prev) => ({ ...prev, [assignmentId]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {forms.map((assignment) => {
        const isSubmitted = statuses[assignment.assignmentId] === "submitted"
        const isLoading = submitting[assignment.assignmentId]
        const error = errors[assignment.assignmentId]
        const fieldErrors = validationErrors[assignment.assignmentId]

        return (
          <Card key={assignment.assignmentId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="size-5 text-muted-foreground" />
                  <CardTitle>{assignment.form.name}</CardTitle>
                </div>
                {isSubmitted && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle2Icon className="size-3" />
                    Completed
                  </Badge>
                )}
              </div>
              {assignment.form.description && (
                <CardDescription>{assignment.form.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2Icon className="size-4" />
                  This form has been submitted. Thank you!
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSubmit(assignment)
                  }}
                  className="flex flex-col gap-4"
                >
                  {assignment.form.fields.map((field) => {
                    const hasError = fieldErrors?.has(field.name)

                    return (
                      <div key={field.name} className="flex flex-col gap-2">
                        {field.type === "checkbox" ? (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`${assignment.assignmentId}-${field.name}`}
                              checked={
                                formData[assignment.assignmentId]?.[field.name] ||
                                false
                              }
                              onCheckedChange={(checked) =>
                                updateField(
                                  assignment.assignmentId,
                                  field.name,
                                  checked === true
                                )
                              }
                            />
                            <Label
                              htmlFor={`${assignment.assignmentId}-${field.name}`}
                            >
                              {field.label}
                              {field.required && " *"}
                            </Label>
                          </div>
                        ) : (
                          <Label
                            htmlFor={`${assignment.assignmentId}-${field.name}`}
                          >
                            {field.label}
                            {field.required && " *"}
                          </Label>
                        )}

                        {field.type === "text" && (
                          <Input
                            id={`${assignment.assignmentId}-${field.name}`}
                            value={
                              formData[assignment.assignmentId]?.[field.name] ?? ""
                            }
                            onChange={(e) =>
                              updateField(
                                assignment.assignmentId,
                                field.name,
                                e.target.value
                              )
                            }
                          />
                        )}

                        {field.type === "textarea" && (
                          <Textarea
                            id={`${assignment.assignmentId}-${field.name}`}
                            value={
                              formData[assignment.assignmentId]?.[field.name] ?? ""
                            }
                            onChange={(e) =>
                              updateField(
                                assignment.assignmentId,
                                field.name,
                                e.target.value
                              )
                            }
                            rows={4}
                          />
                        )}

                        {field.type === "select" && (
                          <Select
                            value={
                              formData[assignment.assignmentId]?.[field.name] ?? ""
                            }
                            onValueChange={(value) =>
                              updateField(
                                assignment.assignmentId,
                                field.name,
                                value
                              )
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
                        )}

                        {hasError && (
                          <p className="text-sm text-red-600">
                            {field.label} is required
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <Button type="submit" size="lg" disabled={isLoading}>
                    {isLoading ? "Submitting..." : "Submit"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
