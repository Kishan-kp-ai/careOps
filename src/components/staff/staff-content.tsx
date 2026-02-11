"use client"

import { useState, useEffect, useCallback } from "react"
import { Users, PlusIcon, UserPlusIcon } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface StaffMember {
  id: string
  role: string
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
}

interface StaffContentProps {
  workspaceId: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function StaffContent({ workspaceId }: StaffContentProps) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/staff`)
      if (res.ok) {
        const data = await res.json()
        setStaff(data)
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccessMessage("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName, email: inviteEmail }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to invite staff member")
        return
      }

      setSuccessMessage("Staff member invited successfully")
      setInviteName("")
      setInviteEmail("")
      setDialogOpen(false)
      fetchStaff()
    } catch {
      setError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Staff"
        description="Manage your team members"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlusIcon />
                Invite Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Invite Staff Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a new team member.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invite-name">Name</Label>
                    <Input
                      id="invite-name"
                      placeholder="Full name"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Inviting..." : "Send Invite"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Loading...
        </div>
      ) : staff.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
          <Users className="size-10 opacity-50" />
          <p className="text-sm">No staff members yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium leading-none">
                    {member.user.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {member.user.email}
                  </p>
                </div>
                <Badge
                  variant={member.role === "OWNER" ? "default" : "secondary"}
                >
                  {member.role}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
