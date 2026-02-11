"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  FileText,
  Package,
  Users,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { MemberRole } from "@/generated/prisma/client"

interface SidebarProps {
  workspace: { id: string; name: string; slug: string }
  userRole: MemberRole
}

const navItems = (slug: string) => [
  { href: `/w/${slug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { href: `/w/${slug}/inbox`, label: "Inbox", icon: MessageSquare },
  { href: `/w/${slug}/bookings`, label: "Bookings", icon: Calendar },
  { href: `/w/${slug}/forms`, label: "Forms", icon: FileText },
  { href: `/w/${slug}/inventory`, label: "Inventory", icon: Package },
]

const ownerItems = (slug: string) => [
  { href: `/w/${slug}/staff`, label: "Staff", icon: Users },
  { href: `/w/${slug}/settings`, label: "Settings", icon: Settings },
]

export function Sidebar({ workspace, userRole }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems(workspace.slug)
  const ownerOnly = ownerItems(workspace.slug)

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 px-4 py-5">
        <h2 className="truncate text-lg font-semibold">{workspace.name}</h2>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {userRole === "OWNER" && (
          <>
            <div className="my-3 border-t border-slate-700" />
            {ownerOnly.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="border-t border-slate-700 px-3 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-5 shrink-0" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
