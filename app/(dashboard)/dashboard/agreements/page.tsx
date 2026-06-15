'use client'

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
import {
  ClipboardList, FileCheck, MapPin, CalendarClock, AlertTriangle,
  Plus, Loader2, Pencil, Trash2, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type AgreementStatus = 'Active' | 'Pending Approval' | 'Expired' | 'Cancelled'

type Agreement = {
  id: string
  user_id: string
  created_at: string
  title: string
  customer_id: string | null
  customer_name: string | null
  status: AgreementStatus
  start_date: string | null
  end_date: string | null
  value: number | null
  sites: number
  assets: number
  pm_plans: number
  pm_due: number
  pm_overdue: number
  notes: string | null
}

type Customer = { id: string; name: string }

type FormData = {
  title: string
  customer_id: string
  status: AgreementStatus
  start_date: string
  end_date: string
  value: string
  notes: string
}

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUSES: AgreementStatus[] = ['Active', 'Pending Approval', 'Expired', 'Cancelled']

const STATUS_STYLES: Record<AgreementStatus, string> = {
  'Active':           'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Pending Approval': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Expired':          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'Cancelled':        'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

const EMPTY_FORM: FormData = {
  title: '',
  customer_id: '',
  status: 'Pending Approval',
  start_date: '',
  end_date: '',
  value: '',
  notes: '',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AgreementsPage() {
  const [agreements, setAgreements] = React.useState<Agreement[]>([])
  const [customers, setCustomers]   = React.useState<Customer[]>([])
  const [loading, setLoading]       = React.useState(true)

  const [sheetOpen, setSheetOpen]     = React.useState(false)
  const [editing, setEditing]         = React.useState<Agreement | null>(null)
  const [form, setForm]               = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError]     = React.useState('')
  const [saving, setSaving]           = React.useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [deleting, setDeleting]               = React.useState(false)

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [agrRes, custRes] = await Promise.all([
      supabase
        .from('agreements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
    ])

    if (agrRes.data)  setAgreements(agrRes.data as Agreement[])
    if (custRes.data) setCustomers(custRes.data)
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  // ─── Derived stats ────────────────────────────────────────────────────────

  const totalCount    = agreements.length
  const pendingCount  = agreements.filter((a) => a.status === 'Pending Approval').length
  const totalSites    = agreements.reduce((s, a) => s + a.sites, 0)
  const totalAssets   = agreements.reduce((s, a) => s + a.assets, 0)
  const activePmPlans = agreements
    .filter((a) => a.status === 'Active')
    .reduce((s, a) => s + a.pm_plans, 0)
  const totalPmDue      = agreements.reduce((s, a) => s + a.pm_due, 0)
  const totalPmOverdue  = agreements.reduce((s, a) => s + a.pm_overdue, 0)

  // ─── Sheet helpers ────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (a: Agreement) => {
    setEditing(a)
    setForm({
      title:       a.title,
      customer_id: a.customer_id ?? '',
      status:      a.status,
      start_date:  a.start_date ?? '',
      end_date:    a.end_date ?? '',
      value:       a.value != null ? String(a.value) : '',
      notes:       a.notes ?? '',
    })
    setFormError('')
    setSheetOpen(true)
  }

  const closeSheet = () => { setSheetOpen(false); setFormError('') }

  const setField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Not authenticated.'); return }

    const selectedCustomer = customers.find((c) => c.id === form.customer_id)

    const payload = {
      title:         form.title.trim(),
      customer_id:   form.customer_id || null,
      customer_name: selectedCustomer?.name ?? null,
      status:        form.status,
      start_date:    form.start_date || null,
      end_date:      form.end_date || null,
      value:         form.value !== '' ? parseFloat(form.value) : null,
      notes:         form.notes.trim() || null,
    }

    if (editing) {
      const { error } = await supabase.from('agreements').update(payload).eq('id', editing.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('agreements').insert({ ...payload, user_id: user.id })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    closeSheet()
    await fetchData()
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('agreements').delete().eq('id', id)
    if (!error) setAgreements((prev) => prev.filter((a) => a.id !== id))
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const statCards = [
    {
      label: 'Agreements',
      value: loading ? '—' : totalCount,
      icon: ClipboardList,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Pending Approvals',
      value: loading ? '—' : pendingCount,
      icon: FileCheck,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Sites / Assets',
      value: loading ? '—' : `${totalSites}/${totalAssets}`,
      icon: MapPin,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Active PM Plans',
      value: loading ? '—' : activePmPlans,
      icon: CalendarClock,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'PM Due / Overdue',
      value: loading ? '—' : `${totalPmDue}/${totalPmOverdue}`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agreements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage maintenance contracts and service agreements</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          New Agreement
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table card */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {loading ? 'Loading…' : `${agreements.length} agreement${agreements.length !== 1 ? 's' : ''}`}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New Agreement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading agreements…
            </div>
          ) : agreements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
                <ClipboardList className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No agreements yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create one to link customers and equipment.</p>
              </div>
              <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 mt-1">
                <Plus className="w-3.5 h-3.5" />
                New Agreement
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Title', 'Customer', 'Status', 'Start Date', 'End Date', 'Value', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          'px-6 py-3 font-medium text-muted-foreground whitespace-nowrap',
                          h === 'Actions' ? 'text-right' : 'text-left',
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((agr) => (
                    <React.Fragment key={agr.id}>
                      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 font-medium text-foreground max-w-[16rem] truncate" title={agr.title}>
                          {agr.title}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {agr.customer_name ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            STATUS_STYLES[agr.status],
                          )}>
                            {agr.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(agr.start_date)}</td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(agr.end_date)}</td>
                        <td className="px-6 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                          {fmtCurrency(agr.value)}
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {deleteConfirmId === agr.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Delete?</span>
                              <Button
                                size="sm" variant="destructive" className="h-7 px-2 text-xs"
                                onClick={() => handleDelete(agr.id)} disabled={deleting}
                              >
                                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                              </Button>
                              <Button
                                size="sm" variant="outline" className="h-7 px-2 text-xs"
                                onClick={() => setDeleteConfirmId(null)} disabled={deleting}
                              >
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <ActionMenu
                              onEdit={() => openEdit(agr)}
                              onDelete={() => setDeleteConfirmId(agr.id)}
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

      {/* Add / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>{editing ? 'Edit Agreement' : 'New Agreement'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Title" required>
              <Input
                placeholder="e.g. Annual HVAC Maintenance Plan"
                value={form.title}
                onChange={setField('title')}
              />
            </Field>

            <Field label="Customer">
              <NativeSelect value={form.customer_id} onChange={setField('customer_id')}>
                <option value="">No customer linked</option>
                {customers.length === 0 && (
                  <option disabled>No customers found — add one first</option>
                )}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Status" required>
              <NativeSelect value={form.status} onChange={setField('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </NativeSelect>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <Input type="date" value={form.start_date} onChange={setField('start_date')} />
              </Field>
              <Field label="End Date">
                <Input type="date" value={form.end_date} onChange={setField('end_date')} />
              </Field>
            </div>

            <Field label="Value ($)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.value}
                onChange={setField('value')}
              />
            </Field>

            <Field label="Notes">
              <textarea
                rows={4}
                placeholder="Contract terms, scope of work…"
                value={form.notes}
                onChange={setField('notes')}
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <SheetFooter className="px-6 py-4 border-t border-border flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={closeSheet} disabled={saving}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                : editing ? 'Save changes' : 'Create agreement'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Action menu ─────────────────────────────────────────────────────────────

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen]     = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef          = React.useRef<HTMLButtonElement>(null)
  const menuRef             = React.useRef<HTMLDivElement>(null)

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 6, left: rect.right - 128 })
    setOpen(true)
  }

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) setOpen(false)
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
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-32 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onEdit() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
