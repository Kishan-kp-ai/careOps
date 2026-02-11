"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Package,
  PlusIcon,
  MinusIcon,
  PackagePlusIcon,
  AlertTriangleIcon,
  PackageXIcon,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"

interface InventoryItem {
  id: string
  name: string
  sku: string
  quantity: number
  lowStockThreshold: number
  unit: string
  isActive: boolean
}

interface InventoryContentProps {
  workspaceId: string
}

function getStatusBadge(item: InventoryItem) {
  if (item.quantity === 0) {
    return <Badge variant="destructive">Out of Stock</Badge>
  }
  if (item.quantity <= item.lowStockThreshold) {
    return <Badge variant="destructive">Low Stock</Badge>
  }
  return <Badge className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>
}

export function InventoryContent({ workspaceId }: InventoryContentProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustType, setAdjustType] = useState<"restock" | "consume">("restock")
  const [adjustDelta, setAdjustDelta] = useState("")
  const [adjustNote, setAdjustNote] = useState("")
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    quantity: "",
    lowStockThreshold: "",
    unit: "",
  })

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/inventory`)
      if (res.ok) {
        setItems(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const openAdjustDialog = (item: InventoryItem, type: "restock" | "consume") => {
    setAdjustItem(item)
    setAdjustType(type)
    setAdjustDelta("")
    setAdjustNote("")
    setAdjustOpen(true)
  }

  const handleAdjust = async () => {
    if (!adjustItem || !adjustDelta) return
    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/inventory/${adjustItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: adjustType,
            delta: Number(adjustDelta),
            ...(adjustNote && { note: adjustNote }),
          }),
        }
      )
      if (res.ok) {
        setAdjustOpen(false)
        fetchItems()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.sku || !newItem.quantity || !newItem.unit) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          sku: newItem.sku,
          quantity: Number(newItem.quantity),
          lowStockThreshold: Number(newItem.lowStockThreshold) || 0,
          unit: newItem.unit,
        }),
      })
      if (res.ok) {
        setAddOpen(false)
        setNewItem({ name: "", sku: "", quantity: "", lowStockThreshold: "", unit: "" })
        fetchItems()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Header title="Inventory" description="Track supplies and resources" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header
        title="Inventory"
        description="Track supplies and resources"
        action={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusIcon />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogDescription>Add a new item to track in your inventory.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="item-name">Name</Label>
                  <Input
                    id="item-name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g. Surgical Gloves"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-sku">SKU</Label>
                  <Input
                    id="item-sku"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="e.g. GLV-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="item-quantity">Initial Quantity</Label>
                    <Input
                      id="item-quantity"
                      type="number"
                      min="0"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="item-unit">Unit</Label>
                    <Input
                      id="item-unit"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      placeholder="e.g. boxes"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="item-threshold">Low Stock Threshold</Label>
                  <Input
                    id="item-threshold"
                    type="number"
                    min="0"
                    value={newItem.lowStockThreshold}
                    onChange={(e) =>
                      setNewItem({ ...newItem, lowStockThreshold: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddItem} disabled={submitting}>
                  {submitting ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageXIcon className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">No inventory items found</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="text-muted-foreground size-4" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.lowStockThreshold}</TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openAdjustDialog(item, "restock")}
                          title="Restock"
                        >
                          <PlusIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openAdjustDialog(item, "consume")}
                          title="Consume"
                        >
                          <MinusIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="text-muted-foreground size-4" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-muted-foreground text-sm">{item.sku}</div>
                    </div>
                    {getStatusBadge(item)}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-3 text-sm">
                    <span>
                      {item.quantity} {item.unit}
                    </span>
                    <span>Threshold: {item.lowStockThreshold}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdjustDialog(item, "restock")}
                    >
                      <PlusIcon />
                      Restock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdjustDialog(item, "consume")}
                    >
                      <MinusIcon />
                      Consume
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Adjust quantity dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustType === "restock" ? (
                <span className="flex items-center gap-2">
                  <PackagePlusIcon className="size-5" />
                  Restock {adjustItem?.name}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertTriangleIcon className="size-5" />
                  Consume {adjustItem?.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {adjustType === "restock"
                ? "Add stock to this item."
                : "Record consumption of this item."}
              {adjustItem && (
                <span className="block mt-1">
                  Current stock: {adjustItem.quantity} {adjustItem.unit}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="adjust-amount">Amount ({adjustItem?.unit})</Label>
              <Input
                id="adjust-amount"
                type="number"
                min="1"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjust-note">Note (optional)</Label>
              <Input
                id="adjust-note"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="e.g. Weekly restock delivery"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAdjust}
              disabled={submitting || !adjustDelta}
              variant={adjustType === "consume" ? "destructive" : "default"}
            >
              {submitting
                ? "Updating..."
                : adjustType === "restock"
                  ? "Restock"
                  : "Consume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
