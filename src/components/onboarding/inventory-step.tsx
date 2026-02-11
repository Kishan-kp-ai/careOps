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

interface InventoryItem {
  id: string
  name: string
  sku: string
  quantity: number
  lowStockThreshold: number
  unit: string
}

interface InventoryStepProps {
  workspaceId: string
  onComplete: () => void
}

export function InventoryStep({ workspaceId, onComplete }: InventoryStepProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [quantity, setQuantity] = useState("")
  const [lowStockThreshold, setLowStockThreshold] = useState("")
  const [unit, setUnit] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !quantity) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku: sku || undefined,
          quantity: parseInt(quantity),
          lowStockThreshold: lowStockThreshold
            ? parseInt(lowStockThreshold)
            : undefined,
          unit,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add item")
      }

      const data = await res.json()
      setItems((prev) => [...prev, data])
      setName("")
      setSku("")
      setQuantity("")
      setLowStockThreshold("")
      setUnit("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
        <CardDescription>
          Track supplies and materials. This step is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="inv-name">Item Name</Label>
            <Input
              id="inv-name"
              placeholder="Exam Gloves"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-sku">SKU (optional)</Label>
              <Input
                id="inv-sku"
                placeholder="GLV-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-unit">Unit</Label>
              <Input
                id="inv-unit"
                placeholder="boxes"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-qty">Quantity</Label>
              <Input
                id="inv-qty"
                type="number"
                min="0"
                placeholder="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-threshold">Low Stock Threshold</Label>
              <Input
                id="inv-threshold"
                type="number"
                min="0"
                placeholder="10"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={!name.trim() || !quantity || loading}
            className="w-full"
          >
            {loading ? "Adding..." : "Add Item"}
          </Button>
        </form>

        {items.length > 0 && (
          <div className="space-y-2">
            <Label>Added Items</Label>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.quantity} {item.unit}
                    {item.sku ? ` · ${item.sku}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDelete(item.id)}
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
          {items.length > 0 && (
            <Button onClick={onComplete} className="flex-1">
              Continue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
