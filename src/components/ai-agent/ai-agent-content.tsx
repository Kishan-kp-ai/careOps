"use client"

import { useEffect, useState } from "react"
import {
  Bot,
  Briefcase,
  Smile,
  Zap,
  Mail,
  Phone,
  UserPlus,
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Loader2,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  toneTemplates,
  ALERT_LABELS,
  TONE_LABELS,
  TONE_DESCRIPTIONS,
  ALERT_TYPES,
  TONES,
  type Tone,
  type AlertType,
} from "@/lib/tone-templates"
import { cn } from "@/lib/utils"

interface AiAgentContentProps {
  workspaceId: string
  workspaceName: string
}

const ALERT_ICONS: Record<AlertType, typeof Mail> = {
  LEAD_CREATED: UserPlus,
  BOOKING_CREATED: CalendarPlus,
  BOOKING_CONFIRMED: CalendarCheck,
  BOOKING_CANCELLED: CalendarX,
}

const TONE_ICONS: Record<Tone, typeof Briefcase> = {
  PROFESSIONAL: Briefcase,
  FRIENDLY: Smile,
  DIRECT: Zap,
}

const SAMPLE_DATA: Record<string, string> = {
  customerName: "Sarah Johnson",
  customerEmail: "sarah@example.com",
  customerPhone: "+1234567890",
  workspaceName: "",
  bookingType: "General Consultation",
  startAt: "March 15, 2026 at 10:00 AM",
  address: "123 Main Street, Suite 100",
  bookingUrl: "https://yoursite.com/b/your-workspace",
  formUrl: "https://yoursite.com/forms/abc123",
}

function resolvePreview(template: string, workspaceName: string): string {
  const data: Record<string, string> = { ...SAMPLE_DATA, workspaceName }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => data[key] || `{{${key}}}`)
}

export function AiAgentContent({ workspaceId, workspaceName }: AiAgentContentProps) {
  const [tones, setTones] = useState<Record<string, Tone>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [previewAlert, setPreviewAlert] = useState<AlertType | null>(null)

  useEffect(() => {
    async function fetchTones() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/tone`)
        if (res.ok) {
          const data = await res.json()
          setTones(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchTones()
  }, [workspaceId])

  async function handleToneChange(alertType: AlertType, tone: Tone) {
    if (tones[alertType] === tone) return

    setSaving(alertType)
    setSaved(null)

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tone`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertType, tone }),
      })

      if (res.ok) {
        setTones((prev) => ({ ...prev, [alertType]: tone }))
        setSaved(alertType)
        setTimeout(() => setSaved(null), 2000)
      }
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-teal-100">
            <Bot className="size-6 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Message Tone Control</h3>
            <p className="text-sm text-slate-500">
              Choose how your automated messages sound to customers. Select a tone for each alert type and preview the message below.
            </p>
          </div>
        </CardContent>
      </Card>

      {ALERT_TYPES.map((alertType) => {
        const AlertIcon = ALERT_ICONS[alertType]
        const currentTone = tones[alertType] || "PROFESSIONAL"
        const template = toneTemplates[alertType][currentTone]
        const isPreviewOpen = previewAlert === alertType

        return (
          <Card key={alertType} className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">
                    <AlertIcon className="size-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{ALERT_LABELS[alertType]}</CardTitle>
                    <CardDescription className="text-xs">
                      Current tone:{" "}
                      <Badge variant="secondary" className="ml-1">
                        {TONE_LABELS[currentTone]}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {saving === alertType && (
                    <Loader2 className="size-4 animate-spin text-slate-400" />
                  )}
                  {saved === alertType && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="size-4" />
                      Saved
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {TONES.map((tone) => {
                  const ToneIcon = TONE_ICONS[tone]
                  const isSelected = currentTone === tone

                  return (
                    <button
                      key={tone}
                      onClick={() => handleToneChange(alertType, tone)}
                      disabled={saving === alertType}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                        isSelected
                          ? "border-teal-500 bg-teal-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                        saving === alertType && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <ToneIcon
                        className={cn(
                          "size-5",
                          isSelected ? "text-teal-600" : "text-slate-400"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-teal-700" : "text-slate-600"
                        )}
                      >
                        {TONE_LABELS[tone]}
                      </span>
                      <span className="text-center text-xs text-slate-400">
                        {TONE_DESCRIPTIONS[tone]}
                      </span>
                    </button>
                  )
                })}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500"
                onClick={() =>
                  setPreviewAlert(isPreviewOpen ? null : alertType)
                }
              >
                <Mail className="mr-2 size-4" />
                {isPreviewOpen ? "Hide Preview" : "Preview Message"}
              </Button>

              {isPreviewOpen && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Mail className="size-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-500 uppercase">Email</span>
                      </div>
                      <p className="mb-1 text-xs font-medium text-slate-400">
                        Subject
                      </p>
                      <p className="mb-3 text-sm font-medium text-slate-800">
                        {resolvePreview(template.subject, workspaceName)}
                      </p>
                      <p className="mb-1 text-xs font-medium text-slate-400">
                        Body
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-slate-600">
                        {resolvePreview(template.body, workspaceName)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Phone className="size-4 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-500 uppercase">SMS</span>
                      </div>
                      <p className="mb-1 text-xs font-medium text-slate-400">
                        Message
                      </p>
                      <p className="text-sm text-slate-600">
                        {resolvePreview(template.smsBody, workspaceName)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
