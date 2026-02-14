"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Trash2Icon } from "lucide-react"

interface StaffMember {
  id: string
  name: string
  email: string
}

interface StaffStepProps {
  workspaceId: string
  onComplete: () => void
}

export function StaffStep({ workspaceId, onComplete }: StaffStepProps) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to invite staff")
      }

      const data = await res.json()
      setStaff((prev) => [...prev, { id: data.id, name: data.user?.name || name, email: data.user?.email || email }])
      setName("")
      setEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id: string) {
    setStaff((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Staff</CardTitle>
        <CardDescription>
          Invite team members to your workspace. This step is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Name</Label>
            <Input
              id="staff-name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="jane@acmehealth.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={!name.trim() || !email.trim() || loading}
            className="w-full"
          >
            {loading ? "Inviting..." : "Invite Staff Member"}
          </Button>
        </form>

        {staff.length > 0 && (
          <div className="space-y-2">
            <Label>Invited Staff</Label>
            {staff.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-muted-foreground text-xs">{member.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDelete(member.id)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onComplete} className="flex-1">
            Skip this step
          </Button>
          {staff.length > 0 && (
            <Button onClick={onComplete} className="flex-1">
              Continue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
