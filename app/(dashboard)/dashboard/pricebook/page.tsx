'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Plus, Search, Pencil, Trash2, Loader2, BookOpen } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

type PricebookItem = {
  id: string
  user_id: string
  name: string
  description: string | null
  unit: string | null
  price: number
  created_at: string
}

type FormData = {
  name: string
  description: string
  unit: string
  price: string
}

const EMPTY_FORM: FormData = { name: '', description: '', unit: '', price: '' }

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PricebookPage() {
  const [items, setItems] = React.useState<PricebookItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<PricebookItem | null>(null)
  const [form, setForm] = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchItems = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('pricebook')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (!error && data) setItems(data)
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchItems() }, [fetchItems])

  // ─── Search filter ──────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return items
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  // ─── Sheet helpers ───────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (item: PricebookItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description ?? '',
      unit: item.unit ?? '',
      price: String(item.price),
    })
    setFormError('')
    setSheetOpen(true)
  }

  const closeSheet = () => { setSheetOpen(false); setFormError('') }

  const setField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    const parsedPrice = parseFloat(form.price)
    if (!form.price || isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Please enter a valid price.')
      return
    }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Not authenticated.'); return }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit.trim() || null,
      price: parsedPrice,
    }

    if (editingItem) {
      const { error } = await supabase.from('pricebook').update(payload).eq('id', editingItem.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('pricebook').insert({ ...payload, user_id: user.id })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    closeSheet()
    await fetchItems()
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('pricebook').delete().eq('id', id)
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pricebook</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Standard services and prices you can attach to jobs
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search by name or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table card */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {loading
              ? 'Loading…'
              : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading pricebook…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <BookOpen className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'No items match your search.'
                  : 'No items yet. Add your first service or product!'}
              </p>
              {!search && (
                <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Description</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Unit</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Price</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground max-w-[20rem] truncate" title={item.description ?? ''}>
                          {item.description ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {item.unit ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3 text-foreground font-medium tabular-nums whitespace-nowrap">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {deleteConfirmId === item.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Delete?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleDelete(item.id)}
                                disabled={deleting}
                              >
                                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={deleting}
                              >
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => openEdit(item)}
                                aria-label="Edit item"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirmId(item.id)}
                                aria-label="Delete item"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>{editingItem ? 'Edit Item' : 'Add Item'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Name" required>
              <Input
                placeholder="e.g. AC Tune-Up"
                value={form.name}
                onChange={setField('name')}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={3}
                placeholder="What's included in this service…"
                value={form.description}
                onChange={setField('description')}
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            <Field label="Price ($)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={setField('price')}
              />
            </Field>

            <Field label="Unit">
              <Input
                placeholder="e.g. per hour, each, per visit"
                value={form.unit}
                onChange={setField('unit')}
              />
            </Field>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={closeSheet} disabled={saving}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                : editingItem ? 'Save changes' : 'Add item'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Field helper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}
