'use client'

/*
  SQL — run in Supabase SQL editor:

  create table public.company_equipment (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    asset_tag text,
    status text not null default 'Available' check (status in ('Available','Deployed','Maintenance')),
    reuses integer not null default 0,
    created_at timestamptz not null default now()
  );

  alter table public.company_equipment enable row level security;

  create policy "company_equipment: owner full access"
    on public.company_equipment for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  grant all on public.company_equipment to anon, authenticated;
*/

import * as React from 'react'
import { createPortal } from 'react-dom'
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
import { Plus, Search, Wrench, Loader2, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

type EquipStatus = 'Available' | 'Deployed' | 'Maintenance'

type Equipment = {
  id: string
  user_id: string
  name: string
  asset_tag: string | null
  status: EquipStatus
  reuses: number
  created_at: string
}

type FormData = {
  name: string
  asset_tag: string
  status: EquipStatus
}

const EMPTY_FORM: FormData = { name: '', asset_tag: '', status: 'Available' }

const STATUS_STYLES: Record<EquipStatus, string> = {
  Available:   'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
  Deployed:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Maintenance: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
}

export default function EquipmentPage() {
  const [items, setItems]           = React.useState<Equipment[]>([])
  const [loading, setLoading]       = React.useState(true)
  const [search, setSearch]         = React.useState('')
  const [statusFilter, setStatus]   = React.useState<'all' | EquipStatus>('all')

  const [sheetOpen, setSheetOpen]   = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<Equipment | null>(null)
  const [form, setForm]             = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError]   = React.useState('')
  const [saving, setSaving]         = React.useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [deleting, setDeleting]               = React.useState(false)

  const fetchData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('company_equipment')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setItems(data as Equipment[])
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter((i) => {
      const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.asset_tag ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || i.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [items, search, statusFilter])

  const registered = items.length
  const deployed   = items.filter((i) => i.status === 'Deployed').length
  const totalReuses = items.reduce((sum, i) => sum + i.reuses, 0)

  const openAdd = () => { setEditingItem(null); setForm(EMPTY_FORM); setFormError(''); setSheetOpen(true) }
  const openEdit = (item: Equipment) => {
    setEditingItem(item)
    setForm({ name: item.name, asset_tag: item.asset_tag ?? '', status: item.status })
    setFormError('')
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      name: form.name.trim(),
      asset_tag: form.asset_tag.trim() || null,
      status: form.status,
    }

    if (editingItem) {
      const { error } = await supabase.from('company_equipment').update(payload).eq('id', editingItem.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('company_equipment').insert({ ...payload, user_id: user.id })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setSheetOpen(false)
    await fetchData()
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    await supabase.from('company_equipment').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Company Equipment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage your tools and equipment</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Unit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registered Units',    value: loading ? '—' : registered,   color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Currently Deployed',  value: loading ? '—' : deployed,     color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Total Reuses',        value: loading ? '—' : totalReuses,  color: 'text-purple-500',bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(({ label, value, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bg)}>
                <Wrench className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
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
          <Input className="pl-9" placeholder="Search by name or asset tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value as typeof statusFilter)}
          className="h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All statuses</option>
          {(['Available', 'Deployed', 'Maintenance'] as EquipStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {loading ? 'Loading…' : `${filtered.length} unit${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading equipment…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Wrench className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== 'all' ? 'No units match your filters.' : 'No equipment yet. Add your first unit!'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add Unit
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Asset Tag', 'Name', 'Status', 'Reuses', 'Current Job', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{item.asset_tag ?? '—'}</td>
                      <td className="px-6 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-6 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[item.status])}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground tabular-nums">{item.reuses}</td>
                      <td className="px-6 py-3 text-muted-foreground">—</td>
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
                          <EquipActionMenu onEdit={() => openEdit(item)} onDelete={() => setDeleteConfirmId(item.id)} />
                        )}
                      </td>
                    </tr>
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
            <SheetTitle>{editingItem ? 'Edit Unit' : 'Add Unit'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Name" required>
              <Input placeholder="e.g. Milwaukee Drill Set" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Asset Tag">
              <Input placeholder="e.g. EQ-001" value={form.asset_tag}
                onChange={(e) => setForm((p) => ({ ...p, asset_tag: e.target.value }))} />
            </Field>
            <Field label="Status">
              <select value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EquipStatus }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                {(['Available', 'Deployed', 'Maintenance'] as EquipStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : editingItem ? 'Save changes' : 'Add Unit'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function EquipActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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
