'use client'

/*
  SQL — run in Supabase SQL editor:

  create table public.inventory (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    part_number text,
    category text,
    quantity integer not null default 0,
    cost numeric(10,2),
    location text,
    status text not null default 'In Stock' check (status in ('In Stock','Low Stock','Out of Stock')),
    created_at timestamptz not null default now()
  );

  alter table public.inventory enable row level security;

  create policy "inventory: owner full access"
    on public.inventory for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  grant all on public.inventory to anon, authenticated;
*/

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
import { Plus, Search, Package, Loader2, Pencil, Trash2, MoreHorizontal, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

type ItemStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

type InventoryItem = {
  id: string
  user_id: string
  name: string
  part_number: string | null
  category: string | null
  quantity: number
  cost: number | null
  location: string | null
  status: ItemStatus
  created_at: string
}

type FormData = {
  name: string
  part_number: string
  category: string
  quantity: string
  cost: string
  location: string
  status: ItemStatus
}

const EMPTY_FORM: FormData = {
  name: '', part_number: '', category: '', quantity: '0', cost: '', location: '', status: 'In Stock',
}

const STATUS_STYLES: Record<ItemStatus, string> = {
  'In Stock':     'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
  'Low Stock':    'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  'Out of Stock': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function fmtCurrency(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function InventoryPage() {
  const [items, setItems]           = React.useState<InventoryItem[]>([])
  const [loading, setLoading]       = React.useState(true)
  const [search, setSearch]         = React.useState('')
  const [catFilter, setCatFilter]   = React.useState('all')
  const [lowStockOnly, setLowOnly]  = React.useState(false)

  const [sheetOpen, setSheetOpen]   = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null)
  const [form, setForm]             = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError]   = React.useState('')
  const [saving, setSaving]         = React.useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [deleting, setDeleting]               = React.useState(false)

  const fetchData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setItems(data as InventoryItem[])
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  const categories = React.useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean) as string[])
    return Array.from(cats).sort()
  }, [items])

  const filtered = React.useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase().trim()
      const matchSearch = !q
        || item.name.toLowerCase().includes(q)
        || (item.part_number ?? '').toLowerCase().includes(q)
      const matchCat = catFilter === 'all' || item.category === catFilter
      const matchLow = !lowStockOnly || item.status !== 'In Stock'
      return matchSearch && matchCat && matchLow
    })
  }, [items, search, catFilter, lowStockOnly])

  const totalValue = React.useMemo(() =>
    items.reduce((sum, i) => sum + (i.cost ?? 0) * i.quantity, 0), [items])
  const lowStockCount  = items.filter((i) => i.status === 'Low Stock').length
  const outOfStockCount = items.filter((i) => i.status === 'Out of Stock').length

  const openAdd = () => { setEditingItem(null); setForm(EMPTY_FORM); setFormError(''); setSheetOpen(true) }
  const openEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setForm({
      name: item.name, part_number: item.part_number ?? '', category: item.category ?? '',
      quantity: String(item.quantity), cost: item.cost !== null ? String(item.cost) : '',
      location: item.location ?? '', status: item.status,
    })
    setFormError('')
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Not authenticated.'); return }

    const payload = {
      name: form.name.trim(),
      part_number: form.part_number.trim() || null,
      category: form.category.trim() || null,
      quantity: parseInt(form.quantity) || 0,
      cost: form.cost !== '' ? parseFloat(form.cost) : null,
      location: form.location.trim() || null,
      status: form.status,
    }

    if (editingItem) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editingItem.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('inventory').insert({ ...payload, user_id: user.id })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setSheetOpen(false)
    await fetchData()
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    await supabase.from('inventory').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  const statCards = [
    { label: 'Total Items',    value: items.length,                            color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: Package },
    { label: 'Total Value',    value: fmtCurrency(totalValue),                 color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20', icon: Package },
    { label: 'Low Stock',      value: lowStockCount,                           color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: AlertTriangle },
    { label: 'Out of Stock',   value: outOfStockCount,                         color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',     icon: XCircle },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track parts, materials, and supplies</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {loading ? '—' : value}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9" placeholder="Search by name or part #…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLowOnly((v) => !v)}
          className="gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock
        </Button>
      </div>

      {/* Table */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {loading ? 'Loading…' : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading inventory…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Package className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search || catFilter !== 'all' || lowStockOnly ? 'No items match your filters.' : 'No items found. Add your first one!'}
              </p>
              {!search && catFilter === 'all' && !lowStockOnly && (
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
                    {['Part #', 'Name', 'Category', 'On Hand', 'Cost', 'Location', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{item.part_number ?? '—'}</td>
                        <td className="px-6 py-3 font-medium text-foreground">{item.name}</td>
                        <td className="px-6 py-3 text-muted-foreground">{item.category ?? '—'}</td>
                        <td className="px-6 py-3 text-muted-foreground tabular-nums">{item.quantity}</td>
                        <td className="px-6 py-3 text-muted-foreground tabular-nums">{fmtCurrency(item.cost)}</td>
                        <td className="px-6 py-3 text-muted-foreground">{item.location ?? '—'}</td>
                        <td className="px-6 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[item.status])}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {deleteConfirmId === item.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Delete?</span>
                              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs"
                                onClick={() => handleDelete(item.id)} disabled={deleting}>
                                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                onClick={() => setDeleteConfirmId(null)} disabled={deleting}>
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <ItemActionMenu
                              onEdit={() => openEdit(item)}
                              onDelete={() => setDeleteConfirmId(item.id)}
                            />
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

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>{editingItem ? 'Edit Item' : 'Add Item'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Name" required>
              <Input placeholder="e.g. 1/2 inch copper pipe" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Part Number">
              <Input placeholder="e.g. CP-50-10" value={form.part_number}
                onChange={(e) => setForm((p) => ({ ...p, part_number: e.target.value }))} />
            </Field>
            <Field label="Category">
              <Input placeholder="e.g. Plumbing, HVAC, Electrical" value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
            </Field>
            <Field label="Quantity on Hand">
              <Input type="number" min="0" value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </Field>
            <Field label="Cost ($)">
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.cost}
                onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))} />
            </Field>
            <Field label="Location">
              <Input placeholder="e.g. Warehouse Shelf B3" value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </Field>
            <Field label="Status">
              <select value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ItemStatus }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                {(['In Stock', 'Low Stock', 'Out of Stock'] as ItemStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : editingItem ? 'Save changes' : 'Add Item'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function ItemActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const h = () => setOpen(false)
    window.addEventListener('scroll', h, true)
    return () => window.removeEventListener('scroll', h, true)
  }, [open])

  return (
    <>
      <button ref={triggerRef} type="button" onClick={openMenu}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && createPortal(
        <div ref={menuRef} role="menu" style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors">
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
