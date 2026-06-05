'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
import { ArrowLeft, Briefcase, FileText, Pencil, Clock, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

type JobStatus = 'Scheduled' | 'In Progress' | 'Completed'

type FullJob = {
  id: string
  user_id: string
  customer_id: string | null
  job_number: number | null
  title: string
  description: string | null
  notes: string | null
  status: JobStatus
  scheduled_date: string | null
  start_time: string | null
  end_time: string | null
  price: number | null
  created_at: string
  customers: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
  } | null
}

type CustomerOption = { id: string; name: string }

type FormData = {
  title: string
  customer_id: string
  status: JobStatus
  scheduled_date: string
  start_time: string
  end_time: string
  price: string
  description: string
  notes: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed']

const STATUS_STYLES: Record<JobStatus, string> = {
  Scheduled:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'In Progress':'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
}

const EMPTY_FORM: FormData = {
  title: '', customer_id: '', status: 'Scheduled',
  scheduled_date: '', start_time: '', end_time: '',
  price: '', description: '', notes: '',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[status])}>
      {status}
    </span>
  )
}

function fmtJobNumber(num: number | null | undefined, createdAt: string): string {
  if (num == null) return '—'
  const year = new Date(createdAt).getFullYear()
  return `JOB-${year}-${String(num).padStart(6, '0')}`
}

function fmtCurrency(n: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtDateTime(s: string): string {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function fmtTime(t: string | null): string {
  if (!t) return '—'
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr)
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${mStr} ${period}`
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [job, setJob]           = React.useState<FullJob | null>(null)
  const [customers, setCustomers] = React.useState<CustomerOption[]>([])
  const [loading, setLoading]   = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [updatingStatus, setUpdatingStatus] = React.useState(false)

  // Edit sheet
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [form, setForm]           = React.useState<FormData>(EMPTY_FORM)
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving]       = React.useState(false)

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const loadJob = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [jobRes, customersRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(id, name, email, phone, address)')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name'),
    ])

    if (!jobRes.data) {
      setNotFound(true)
    } else {
      setJob(jobRes.data as FullJob)
    }
    if (customersRes.data) setCustomers(customersRes.data)
    setLoading(false)
  }, [id])

  React.useEffect(() => { loadJob() }, [loadJob])

  // ─── Status update ────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job || newStatus === job.status) return
    setUpdatingStatus(true)
    setJob((prev) => prev ? { ...prev, status: newStatus } : prev)
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', id)
    if (error) loadJob()
    setUpdatingStatus(false)
  }

  // ─── Edit sheet ───────────────────────────────────────────────────────────

  const openEdit = () => {
    if (!job) return
    setForm({
      title:          job.title,
      customer_id:    job.customer_id ?? '',
      status:         job.status,
      scheduled_date: job.scheduled_date ?? '',
      start_time:     job.start_time ?? '',
      end_time:       job.end_time ?? '',
      price:          job.price != null ? String(job.price) : '',
      description:    job.description ?? '',
      notes:          job.notes ?? '',
    })
    setFormError('')
    setSheetOpen(true)
  }

  const closeSheet = () => { setSheetOpen(false); setFormError('') }

  const setField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    setSaving(true)
    setFormError('')

    const payload = {
      title:          form.title.trim(),
      customer_id:    form.customer_id || null,
      status:         form.status,
      scheduled_date: form.scheduled_date || null,
      start_time:     form.start_time || null,
      end_time:       form.end_time || null,
      price:          form.price !== '' ? parseFloat(form.price) : null,
      description:    form.description.trim() || null,
      notes:          form.notes.trim() || null,
    }

    const { error } = await supabase.from('jobs').update(payload).eq('id', id)
    if (error) { setFormError(error.message); setSaving(false); return }

    setSaving(false)
    closeSheet()
    await loadJob()
  }

  // ─── Loading / not found ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading job…
      </div>
    )
  }

  if (notFound || !job) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <Briefcase className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Job not found.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/jobs">← Back to Jobs</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/jobs">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground font-mono tracking-tight">
              {fmtJobNumber(job.job_number, job.created_at)}
            </h1>
            <StatusDropdown
              currentStatus={job.status}
              onStatusChange={handleStatusChange}
              updating={updatingStatus}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href="/dashboard/estimates/new">
              <FileText className="w-3.5 h-3.5" />
              Create Estimate
            </Link>
          </Button>
          <Button size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            Edit Job
          </Button>
        </div>
      </div>

      {/* ── Job title ── */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">{job.title}</h2>
        {job.description && (
          <p className="text-sm text-muted-foreground mt-1">{job.description}</p>
        )}
      </div>

      {/* ── Three info cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Customer card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {job.customers ? (
              <>
                <InfoRow label="Name"    value={job.customers.name} />
                <InfoRow label="Phone"   value={job.customers.phone} />
                <InfoRow label="Email"   value={job.customers.email} />
                <InfoRow label="Address" value={job.customers.address} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">No customer linked.</p>
            )}
          </CardContent>
        </Card>

        {/* Job Details card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InfoRow label="Scheduled Date" value={fmtDate(job.scheduled_date)} />
            {(job.start_time || job.end_time) && (
              <InfoRow
                label="Time"
                value={`${fmtTime(job.start_time)} – ${fmtTime(job.end_time)}`}
              />
            )}
          </CardContent>
        </Card>

        {/* Pricing card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InfoRow label="Price" value={fmtCurrency(job.price)} />
          </CardContent>
        </Card>

      </div>

      {/* ── Notes card ── */}
      {job.notes && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{job.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Timeline card ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-0">
            <TimelineRow
              icon={<Briefcase className="w-3.5 h-3.5" />}
              label="Job created"
              timestamp={fmtDateTime(job.created_at)}
              isLast
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Edit sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>Edit Job</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <Field label="Title" required>
              <Input placeholder="e.g. AC repair at unit 4B" value={form.title} onChange={setField('title')} />
            </Field>

            <Field label="Customer">
              <NativeSelect value={form.customer_id} onChange={setField('customer_id')}>
                <option value="">Select a customer…</option>
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time">
                <Input type="time" value={form.start_time} onChange={setField('start_time')} />
              </Field>
              <Field label="End Time">
                <Input type="time" value={form.end_time} onChange={setField('end_time')} />
              </Field>
            </div>

            <Field label="Price ($)">
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price} onChange={setField('price')}
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
            <Button variant="outline" className="flex-1" onClick={closeSheet} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                : 'Save changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  )
}

// ─── Status dropdown (portal-based) ──────────────────────────────────────────

function StatusDropdown({ currentStatus, onStatusChange, updating }: {
  currentStatus: JobStatus
  onStatusChange: (s: JobStatus) => void
  updating: boolean
}) {
  const [open, setOpen]     = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const triggerRef          = React.useRef<HTMLButtonElement>(null)
  const menuRef             = React.useRef<HTMLDivElement>(null)

  const DROPDOWN_HEIGHT = 116

  const openMenu = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setCoords({
      top:  spaceBelow >= DROPDOWN_HEIGHT ? rect.bottom + 6 : rect.top - DROPDOWN_HEIGHT - 6,
      left: rect.left,
    })
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
        disabled={updating}
        className="inline-flex items-center gap-1.5 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {updating
          ? <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[currentStatus])}>
              <Loader2 className="w-3 h-3 animate-spin" />{currentStatus}
            </span>
          : <StatusBadge status={currentStatus} />}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
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
              onClick={() => { onStatusChange(s); setOpen(false) }}
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

// ─── Timeline row ─────────────────────────────────────────────────────────────

function TimelineRow({ icon, label, timestamp, isLast }: {
  icon: React.ReactNode
  label: string
  timestamp: string
  isLast?: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className="pb-5 pt-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-foreground">
        {value ?? <span className="text-muted-foreground/40">—</span>}
      </p>
    </div>
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
