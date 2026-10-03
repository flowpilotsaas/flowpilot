'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useOrganization } from '@/hooks/useOrganization'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { TrialExpiredModal } from '@/components/TrialExpiredModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
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
import { Plus, Search, Pencil, Trash2, Loader2, BookOpen, MoreHorizontal } from 'lucide-react'

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

type DeleteTarget =
  | { kind: 'single'; id: string; name: string }
  | { kind: 'bulk'; count: number }
  | null

const EMPTY_FORM: FormData = { name: '', description: '', unit: '', price: '' }

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

  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget>(null)
  const [deleting, setDeleting] = React.useState(false)

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const { organizationId } = useOrganization()
  const { isAllowed: trialAllowed, isLoading: trialLoading } = useTrialStatus()
  const [trialModalOpen, setTrialModalOpen] = React.useState(false)

  const fetchItems = React.useCallback(async () => {
    if (!organizationId) return
    const { data, error } = await supabase.from('pricebook').select('*').eq('organization_id', organizationId).order('name')
    if (!error && data) setItems(data)
    setLoading(false)
  }, [organizationId])

  React.useEffect(() => { fetchItems() }, [fetchItems])

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return items
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q))
  }, [items, search])

  // ─── Bulk select helpers ────────────────────────────────────────────────

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id))
  const someSelected = filtered.some((i) => selectedIds.has(i.id))
  const selectAll = () => setSelectedIds(new Set(filtered.map((i) => i.id)))
  const deselectAll = () => setSelectedIds(new Set())

  // ─── Sheet helpers ───────────────────────────────────────────────────────

  const openAdd = () => { setEditingItem(null); setForm(EMPTY_FORM); setFormError(''); setSheetOpen(true) }

  const openEdit = (item: PricebookItem) => {
    setEditingItem(item)
    setForm({ name: item.name, description: item.description ?? '', unit: item.unit ?? '', price: String(item.price) })
    setFormError('')
    setSheetOpen(true)
  }

  const closeSheet = () => { setSheetOpen(false); setFormError('') }

  const setField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!trialAllowed) { setTrialModalOpen(true); return }
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    const parsedPrice = parseFloat(form.price)
    if (!form.price || isNaN(parsedPrice) || parsedPrice < 0) { setFormError('Please enter a valid price.'); return }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Please sign in and try again.'); return }
    if (!organizationId) { setSaving(false); setFormError('Organization not found — please refresh the page.'); return }

    const payload = { name: form.name.trim(), description: form.description.trim() || null, unit: form.unit.trim() || null, price: parsedPrice }

    if (editingItem) {
      const { error } = await supabase.from('pricebook').update(payload).eq('id', editingItem.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('pricebook').insert({ ...payload, user_id: user.id, organization_id: organizationId })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    toast.success(editingItem ? 'Item updated' : 'Item created')
    setSaving(false)
    closeSheet()
    await fetchItems()
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!trialAllowed) { setTrialModalOpen(true); setDeleteTarget(null); return }
    setDeleting(true)
    const { error } = await supabase.from('pricebook').delete().eq('id', id)
    if (error) { toast.error('Failed to delete item'); setDeleting(false); return }
    setItems((prev) => prev.filter((i) => i.id !== id))
    toast.success('Item deleted')
    setDeleteTarget(null)
    setDeleting(false)
  }

  const handleBulkDelete = async () => {
    if (!trialAllowed) { setTrialModalOpen(true); setDeleteTarget(null); return }
    setDeleting(true)
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('pricebook').delete().in('id', ids)
    if (error) { toast.error('Failed to delete items'); setDeleting(false); return }
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)))
    setSelectedIds(new Set())
    toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} deleted`)
    setDeleteTarget(null)
    setDeleting(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pricebook</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Standard services and prices you can attach to jobs</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input className="pl-9" placeholder="Search by name or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          {selectedIds.size > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={deselectAll} className="h-8 px-3 text-xs cursor-pointer">Clear</Button>
                <Button
                  size="sm" variant="destructive" className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                  onClick={() => setDeleteTarget({ kind: 'bulk', count: selectedIds.size })}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size}
                </Button>
              </div>
            </div>
          ) : (
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {loading ? 'Loading…' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading pricebook…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{search ? 'No results found' : 'No items yet'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{search ? 'Try adjusting your search.' : 'Add services and products you can attach to jobs.'}</p>
              </div>
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
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                        className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                        aria-label="Select all"
                      />
                    </th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Name</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Description</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Unit</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Price</th>
                    <th className="text-right px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 rounded border-input accent-primary cursor-pointer block"
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{item.name}</td>
                      <td className="px-6 py-4 text-muted-foreground max-w-[20rem] truncate" title={item.description ?? ''}>
                        {item.description ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {item.unit ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-6 py-4 text-foreground font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <ActionMenu
                          onEdit={() => openEdit(item)}
                          onDelete={() => setDeleteTarget({ kind: 'single', id: item.id, name: item.name })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmModal
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === 'single'
            ? `Delete "${deleteTarget.name}"?`
            : `Delete ${deleteTarget?.count ?? 0} item${(deleteTarget?.count ?? 0) !== 1 ? 's' : ''}?`
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.kind === 'single') handleDelete(deleteTarget.id)
          else if (deleteTarget?.kind === 'bulk') handleBulkDelete()
        }}
        loading={deleting}
      />

      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>{editingItem ? 'Edit Item' : 'Add Item'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Name" required>
              <Input placeholder="e.g. AC Tune-Up" value={form.name} onChange={setField('name')} />
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
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={setField('price')} />
            </Field>
            <Field label="Unit">
              <Input placeholder="e.g. per hour, each, per visit" value={form.unit} onChange={setField('unit')} />
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={closeSheet} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || trialLoading}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : editingItem ? 'Save changes' : 'Add item'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <TrialExpiredModal open={trialModalOpen} onClose={() => setTrialModalOpen(false)} />
    </div>
  )
}

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen]     = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef          = React.useRef<HTMLButtonElement>(null)
  const menuRef             = React.useRef<HTMLDivElement>(null)

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 6, left: rect.right - 144 })
    setOpen(true)
  }

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    window.addEventListener('scroll', handler, true)
    return () => window.removeEventListener('scroll', handler, true)
  }, [open])

  return (
    <>
      <button ref={triggerRef} type="button" onClick={openMenu}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        aria-label="Actions" aria-haspopup="menu" aria-expanded={open}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && createPortal(
        <div ref={menuRef} role="menu" style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors cursor-pointer">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}
