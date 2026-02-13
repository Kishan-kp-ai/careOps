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

const features = [
  {
    icon: MessageSquare,
    title: "Inbox",
    tag: "Email & SMS",
    description: "All customer communication in one place. Never miss a lead or follow-up again.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    icon: Calendar,
    title: "Bookings",
    tag: "Automated",
    description: "Public booking pages with confirmations, reminders & real-time status tracking.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: FileText,
    title: "Forms",
    tag: "Dynamic",
    description: "Auto-send post-booking intake forms and track completion in real time.",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    icon: Package,
    title: "Inventory",
    tag: "Smart Alerts",
    description: "Monitor stock levels with low-stock alerts, usage tracking & forecasting.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
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
      {/* Header */}
      <header className="bg-gray-900 px-20 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="CareOps" width={32} height={32} />
            <h1 className="text-xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">Care</span><span className="text-white">Ops</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Log in
            </Link>
            <Button
              asChild
              className="rounded-lg bg-white px-5 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              <Link href="/register">Get CareOps free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-cover bg-center px-6 pb-20 pt-28 text-center lg:pt-40 lg:pb-28" style={{ backgroundImage: "url('/hero-bg.jpg')" }}>
        <div className="absolute inset-0 bg-white/30" />
        <div className="relative">
          <h2 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Manage. Automate.
            <br />
            Grow your business.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg font-medium text-gray-800">
            CareOps is the all-in-one platform where better, faster operations
            happen.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="rounded-lg bg-gray-900 px-7 py-6 text-base font-medium text-white hover:bg-gray-800"
            >
              <Link href="/register">
                Get CareOps free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="bg-gray-900 px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl bg-gray-800 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex size-9 items-center justify-center rounded-lg ${feature.bg}`}>
                  <feature.icon className={`size-[18px] ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <span className={`rounded-full ${feature.bg} px-2.5 py-0.5 text-[11px] font-medium ${feature.color}`}>
                  {feature.tag}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-400">
                {feature.description}
              </p>
              <Link
                href="/register"
                className={`mt-4 inline-flex items-center text-sm font-medium ${feature.color} opacity-0 transition-opacity group-hover:opacity-100`}
              >
                Learn more <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>



      {/* Steps */}
      <section
        className="border-t border-gray-100 px-6 py-24 bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url('/steps-bg.jpg')" }}
      >
        <div className="mx-auto max-w-xl text-center">
          <h3 className="text-3xl font-bold tracking-tight text-gray-900">
            Get started in minutes
          </h3>
          <p className="mt-3 font-semibold text-gray-900">
            Our guided onboarding walks you through every step.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="relative space-y-0">
            <div className="absolute bottom-4 left-[15px] top-4 w-px bg-gray-200" />
            {steps.map((step, i) => (
              <div
                key={step}
                className="group relative flex items-center gap-4 py-3"
              >
                <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white ring-4 ring-white">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {step}
                </span>
                <CheckCircle2 className="ml-auto size-4 text-green-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h3 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Start using CareOps today
          </h3>
          <p className="mx-auto mt-4 max-w-lg text-gray-400">
            Join businesses that have simplified their workflow. Set up in
            minutes, not hours.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="rounded-lg bg-white px-7 py-6 text-base font-medium text-gray-900 hover:bg-gray-100"
            >
              <Link href="/register">
                Get CareOps free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-gray-400">
          CareOps — Unified Operations Platform
        </div>
      </footer>
    </div>
  )
}
