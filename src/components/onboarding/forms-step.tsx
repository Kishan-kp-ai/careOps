"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { Trash2Icon, PlusIcon, SparklesIcon, Loader2Icon } from "lucide-react"

interface FormField {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "checkbox"
  required: boolean
  options?: string[]
}

interface AISuggestion {
  name: string
  description: string
  fields: FormField[]
}

interface FormsStepProps {
  workspaceId: string
  onComplete: () => void
}

export function FormsStep({ workspaceId, onComplete }: FormsStepProps) {
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [fields, setFields] = useState<FormField[]>([])
  const [fieldLabel, setFieldLabel] = useState("")
  const [fieldType, setFieldType] = useState<FormField["type"]>("text")
  const [fieldRequired, setFieldRequired] = useState(false)
  const [selectOptions, setSelectOptions] = useState<string[]>([])
  const [optionInput, setOptionInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")

  async function handleAiSuggest() {
    setAiLoading(true)
    setAiError("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "forms" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to generate suggestions")
      }

      const data = await res.json()
      const suggestion = data.suggestions as AISuggestion
      setFormName(suggestion.name)
      setFormDescription(suggestion.description)
      setFields(suggestion.fields)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAiLoading(false)
    }
  }

  function handleAddOption() {
    if (optionInput.trim()) {
      setSelectOptions((prev) => [...prev, optionInput.trim()])
      setOptionInput("")
    }
  }

  function handleRemoveOption(index: number) {
    setSelectOptions((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddField() {
    if (!fieldLabel.trim()) return

    const key = fieldLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
    const field: FormField = {
      key,
      label: fieldLabel,
      type: fieldType,
      required: fieldRequired,
    }
    if (fieldType === "select" && selectOptions.length > 0) {
      field.options = [...selectOptions]
    }

    setFields((prev) => [...prev, field])
    setFieldLabel("")
    setFieldType("text")
    setFieldRequired(false)
    setSelectOptions([])
  }

  function handleRemoveField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveForm() {
    if (!formName.trim() || fields.length === 0) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          fields,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create form")
      }

      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post-Booking Forms</CardTitle>
        <CardDescription>
          Create forms that clients fill out after booking. This step is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!saved ? (
          <>
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
              {aiLoading ? "Generating form..." : "Generate with AI"}
            </Button>

            {aiError && (
              <p className="text-destructive text-sm">{aiError}</p>
            )}

            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Form Name</Label>
                <Input
                  id="form-name"
                  placeholder="Patient Intake Form"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-desc">Description</Label>
                <Input
                  id="form-desc"
                  placeholder="Information we need before your visit"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Add Field</p>
              <div className="space-y-2">
                <Label htmlFor="field-label">Label</Label>
                <Input
                  id="field-label"
                  placeholder="Full Name"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-type">Type</Label>
                <Select
                  value={fieldType}
                  onValueChange={(v) => setFieldType(v as FormField["type"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fieldType === "select" && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add option"
                      value={optionInput}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddOption()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={handleAddOption}
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                  {selectOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectOptions.map((opt, i) => (
                        <span
                          key={i}
                          className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        >
                          {opt}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(i)}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  id="field-required"
                  checked={fieldRequired}
                  onCheckedChange={setFieldRequired}
                />
                <Label htmlFor="field-required">Required</Label>
              </div>

              <Button
                type="button"
                variant="secondary"
                disabled={!fieldLabel.trim()}
                onClick={handleAddField}
                className="w-full"
              >
                Add Field
              </Button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-2">
                <Label>Form Fields</Label>
                {fields.map((field, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {field.label}
                        {field.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {field.type}
                        {field.options ? ` · ${field.options.join(", ")}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemoveField(i)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <Button
              onClick={handleSaveForm}
              disabled={!formName.trim() || fields.length === 0 || loading}
              className="w-full"
            >
              {loading ? "Saving..." : "Save Form"}
            </Button>
          </>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Form &quot;{formName}&quot; has been created with {fields.length}{" "}
              field{fields.length !== 1 ? "s" : ""}.
            </p>
            <Button onClick={onComplete} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {!saved && (
          <Button variant="ghost" onClick={onComplete} className="w-full">
            Skip this step
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
