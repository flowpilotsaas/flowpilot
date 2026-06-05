'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
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
import { Plus, Search, Pencil, Trash2, Loader2, Briefcase, MoreHorizontal, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type JobStatus = 'Scheduled' | 'In Progress' | 'Completed'

type Job = {
  id: string
  user_id: string
  customer_id: string | null
  title: string
  description: string | null
  notes: string | null
  status: JobStatus
  scheduled_date: string | null
  price: number | null
  created_at: string
  customers?: { name: string } | null
}

type Customer = {
  id: string
  name: string
}

type FormData = {
  title: string
  customer_id: string
  status: JobStatus
  scheduled_date: string
  price: string
  description: string
  notes: string
}

const STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed']

const EMPTY_FORM: FormData = {
  title: '',
  customer_id: '',
  status: 'Scheduled',
  scheduled_date: '',
  price: '',
  description: '',
  notes: '',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<JobStatus, string> = {
  Scheduled:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'In Progress':'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
}

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingJob, setEditingJob] = React.useState<Job | null>(null)
  const [form, setForm] = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // ─── Data fetching ────────────────────────────────────────────────────

  const fetchData = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [jobsRes, customersRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
    ])

    if (jobsRes.data) setJobs(jobsRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    setLoading(false)
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  // ─── Search filter ────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return jobs
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.customers?.name ?? '').toLowerCase().includes(q)
    )
  }, [jobs, search])

  // ─── Sheet helpers ────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingJob(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setSheetOpen(true)
  }

  const openEdit = (job: Job) => {
    setEditingJob(job)
    setForm({
      title: job.title,
      customer_id: job.customer_id ?? '',
      status: job.status,
      scheduled_date: job.scheduled_date ?? '',
      price: job.price !== null ? String(job.price) : '',
      description: job.description ?? '',
      notes: job.notes ?? '',
    })
    setFormError('')
    setSheetOpen(true)
  }

  const closeSheet = () => { setSheetOpen(false); setFormError('') }

  const setField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ─── Save ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.customer_id) { setFormError('Please select a customer.'); return }
    setSaving(true)
    setFormError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setFormError('Not authenticated.'); return }

    const payload = {
      title: form.title.trim(),
      customer_id: form.customer_id || null,
      status: form.status,
      scheduled_date: form.scheduled_date || null,
      price: form.price !== '' ? parseFloat(form.price) : null,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (editingJob) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', editingJob.id)
      if (error) { setFormError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('jobs').insert({ ...payload, user_id: user.id })
      if (error) { setFormError(error.message); setSaving(false); return }
    }

    setSaving(false)
    closeSheet()
    await fetchData()
  }

  // ─── Delete ───────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (!error) setJobs((prev) => prev.filter((j) => j.id !== id))
    setDeleteConfirmId(null)
    setDeleting(false)
  }

  // ─── Quick status update (inline, no sheet) ──────────────────────────

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    // Optimistic update so the UI responds instantly
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j))
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId)
    // Revert on failure
    if (error) fetchData()
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Schedule and track your field service jobs</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Job
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Search by job title or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table card */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            {loading ? 'Loading…' : `${filtered.length} job${filtered.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading jobs…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Briefcase className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No jobs match your search.' : 'No jobs yet. Add your first one!'}
              </p>
              {!search && (
                <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add Job
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Title</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Scheduled Date</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Price</th>
                    <th className="text-right px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job) => (
                    <React.Fragment key={job.id}>
                      <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 font-medium text-foreground max-w-[16rem] truncate" title={job.title}>
                          <Link
                            href={`/dashboard/jobs/${job.id}`}
                            className="hover:underline hover:text-primary transition-colors"
                          >
                            {job.title}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {job.customers?.name ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-6 py-3">
                          <StatusDropdown
                            jobId={job.id}
                            currentStatus={job.status}
                            onStatusChange={handleStatusChange}
                          />
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(job.scheduled_date)}
                        </td>
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatCurrency(job.price)}
                        </td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {deleteConfirmId === job.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Delete?</span>
                              <Button size="sm" variant="destructive" className="h-7 px-2 text-xs"
                                onClick={() => handleDelete(job.id)} disabled={deleting}>
                                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                onClick={() => setDeleteConfirmId(null)} disabled={deleting}>
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <ActionMenu
                              jobId={job.id}
                              onEdit={() => openEdit(job)}
                              onDelete={() => setDeleteConfirmId(job.id)}
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
            <SheetTitle>{editingJob ? 'Edit Job' : 'Add Job'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Title" required>
              <Input placeholder="e.g. AC repair at unit 4B" value={form.title} onChange={setField('title')} />
            </Field>

            <Field label="Customer" required>
              <NativeSelect value={form.customer_id} onChange={setField('customer_id')}>
                <option value="">Select a customer…</option>
                {customers.length === 0 && (
                  <option disabled>No customers found — add one first</option>
                )}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Status">
              <NativeSelect value={form.status} onChange={setField('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </NativeSelect>
            </Field>

            <Field label="Scheduled Date">
              <Input type="date" value={form.scheduled_date} onChange={setField('scheduled_date')} />
            </Field>

            <Field label="Price ($)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={setField('price')}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={3}
                placeholder="What needs to be done…"
                value={form.description}
                onChange={setField('description')}
                className="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            <Field label="Notes">
              <textarea
                rows={3}
                placeholder="Internal notes…"
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
                : editingJob ? 'Save changes' : 'Add job'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Local helpers ───────────────────────────────────────────────────────────

function ActionMenu({ jobId, onEdit, onDelete }: {
  jobId: string
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen]     = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef          = React.useRef<HTMLButtonElement>(null)
  const menuRef             = React.useRef<HTMLDivElement>(null)

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 6, left: rect.right - 144 }) // 144 = menu width
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
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm"
        >
          <Link
            href={`/dashboard/jobs/${jobId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            View
          </Link>
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
        document.body
      )}
    </>
  )
}

function StatusDropdown({ jobId, currentStatus, onStatusChange }: {
  jobId: string
  currentStatus: JobStatus
  onStatusChange: (id: string, status: JobStatus) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const DROPDOWN_HEIGHT = 116 // ~3 items × ~32px + padding

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= DROPDOWN_HEIGHT
      ? rect.bottom + 6
      : rect.top - DROPDOWN_HEIGHT - 6
    setCoords({ top, left: rect.left })
    setOpen(true)
  }

  // Close on outside click
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

  // Close on any scroll (fixed coords become stale the moment the page moves)
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
        className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <StatusBadge status={currentStatus} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[9999] w-36 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm"
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              role="option"
              aria-selected={s === currentStatus}
              type="button"
              onClick={() => { onStatusChange(jobId, s); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors',
                s === currentStatus && 'bg-muted/50'
              )}
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

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
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
