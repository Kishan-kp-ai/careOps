"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { WorkspaceStep } from "@/components/onboarding/workspace-step"
import { ChannelsStep } from "@/components/onboarding/channels-step"
import { BookingTypesStep } from "@/components/onboarding/booking-types-step"
import { FormsStep } from "@/components/onboarding/forms-step"
import { InventoryStep } from "@/components/onboarding/inventory-step"
import { StaffStep } from "@/components/onboarding/staff-step"
import { ActivateStep } from "@/components/onboarding/activate-step"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const STEPS = [
  { label: "Workspace", required: true },
  { label: "Channels", required: true },
  { label: "Booking Types", required: true },
  { label: "Forms", required: true },
  { label: "Inventory", required: false },
  { label: "Staff", required: false },
  { label: "Activate", required: true },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumedWorkspaceId = searchParams.get("workspaceId")
  const [currentStep, setCurrentStep] = useState(resumedWorkspaceId ? 1 : 0)
  const [workspaceId, setWorkspaceId] = useState<string | null>(resumedWorkspaceId)
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null)

  useEffect(() => {
    if (resumedWorkspaceId && !workspaceSlug) {
      fetch(`/api/workspaces/${resumedWorkspaceId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.slug) setWorkspaceSlug(data.slug)
        })
        .catch(() => {})
    }
  }, [resumedWorkspaceId, workspaceSlug])

  function goToStep(step: number) {
    if (step < 0 || step > 6) return
    if (step > 0 && !workspaceId) return
    if (step <= currentStep) {
      setCurrentStep(step)
    }
  }

  function handleWorkspaceComplete(id: string, slug: string) {
    setWorkspaceId(id)
    setWorkspaceSlug(slug)
    setCurrentStep(1)
  }

  function handleStepComplete() {
    setCurrentStep((prev) => Math.min(prev + 1, 6))
  }

  function handleSkip() {
    setCurrentStep((prev) => Math.min(prev + 1, 6))
  }

  function handleActivate() {
    router.push(`/w/${workspaceSlug}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Set Up Your Workspace
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete these steps to get your workspace ready.
          </p>
        </div>

        <nav className="flex items-center justify-between gap-1">
          {STEPS.map((step, index) => (
            <button
              key={step.label}
              onClick={() => goToStep(index)}
              disabled={index > currentStep || (index > 0 && !workspaceId)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 py-2 transition-colors",
                index <= currentStep
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-40"
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  index === currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="relative w-full h-1.5 rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {currentStep === 0 && (
          <WorkspaceStep onComplete={handleWorkspaceComplete} />
        )}

        {currentStep === 1 && workspaceId && (
          <ChannelsStep
            workspaceId={workspaceId}
            onComplete={handleStepComplete}
          />
        )}

        {currentStep === 2 && workspaceId && (
          <BookingTypesStep
            workspaceId={workspaceId}
            onComplete={handleStepComplete}
          />
        )}

        {currentStep === 3 && workspaceId && (
          <FormsStep
            workspaceId={workspaceId}
            onComplete={handleStepComplete}
          />
        )}

        {currentStep === 4 && workspaceId && (
          <InventoryStep
            workspaceId={workspaceId}
            onComplete={handleStepComplete}
          />
        )}

        {currentStep === 5 && workspaceId && (
          <StaffStep
            workspaceId={workspaceId}
            onComplete={handleStepComplete}
          />
        )}

        {currentStep === 6 && workspaceId && (
          <ActivateStep
            workspaceId={workspaceId}
            onActivate={handleActivate}
          />
        )}

        {currentStep > 0 && currentStep < 6 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => prev - 1)}
            >
              <ChevronLeftIcon />
              Back
            </Button>
            {!STEPS[currentStep].required && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip
                <ChevronRightIcon />
              </Button>
            )}
          </div>
        )}

        {currentStep === 6 && (
          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(5)}
            >
              <ChevronLeftIcon />
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
