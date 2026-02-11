import Link from "next/link"
import {
  Calendar,
  MessageSquare,
  FileText,
  Package,
  Users,
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: MessageSquare,
    title: "Unified Inbox",
    description: "All customer communication in one place — email, SMS, and automated messages.",
  },
  {
    icon: Calendar,
    title: "Smart Bookings",
    description: "Public booking pages, confirmations, reminders, and status tracking.",
  },
  {
    icon: FileText,
    title: "Dynamic Forms",
    description: "Automatically send post-booking forms and track completion.",
  },
  {
    icon: Package,
    title: "Inventory Tracking",
    description: "Monitor stock levels with low-stock alerts and usage forecasting.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Add staff, assign permissions, and manage daily workflows.",
  },
  {
    icon: LayoutDashboard,
    title: "Real-Time Dashboard",
    description: "See bookings, leads, forms, and inventory at a glance.",
  },
]

const steps = [
  "Create your workspace",
  "Connect email & SMS",
  "Set up booking types",
  "Configure forms",
  "Add inventory items",
  "Invite your team",
  "Go live",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            CareOps
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          One platform for your
          <br />
          entire business operations
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
          Replace the chaos of disconnected tools. Manage leads, bookings,
          communications, forms, inventory, and your team — all from a single
          dashboard.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Start for Free
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-t bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h3 className="text-center text-2xl font-bold tracking-tight text-gray-900">
            Everything you need in one place
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">
            No more switching between apps. CareOps connects every part of your
            service business.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <feature.icon className="size-8 text-gray-900" />
                  <h4 className="font-semibold text-gray-900">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h3 className="text-center text-2xl font-bold tracking-tight text-gray-900">
            Get started in minutes
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">
            Our guided onboarding walks you through every step. Your business
            will be fully operational by the end.
          </p>
          <div className="mt-10 space-y-4">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">
                  {i + 1}
                </span>
                <span className="text-gray-700">{step}</span>
                <CheckCircle2 className="ml-auto size-5 text-green-500" />
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" asChild>
              <Link href="/register">
                Create Your Workspace
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-gray-400">
          CareOps — Unified Operations Platform
        </div>
      </footer>
    </div>
  )
}
