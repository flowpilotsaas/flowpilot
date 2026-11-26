'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import type { OrgRole } from '@/hooks/useOrganization'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { TrialExpiredModal } from '@/components/TrialExpiredModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, Briefcase, FileText, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type Customer = { id: string; name: string; email: string | null; phone: string | null }
type TeamMember = { user_id: string; email: string; role: OrgRole }
type JobStatus = 'Scheduled' | 'In Progress' | 'Completed'

type CreatedJob = {
  id: string
  title: string
  customerId: string | null
  customerName: string | null
  assignedTo: string | null
  assigneeEmail: string | null
  scheduledDate: string | null
}

const STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed']

function fmtDate(s: string | null): string {
  if (!s) return ''
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { organizationId, role } = useOrganization()
  const { isAllowed: trialAllowed, isLoading: trialLoading } = useTrialStatus()

  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([])

  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState('')
  const [assignedTo, setAssignedTo] = React.useState('')
  const [status, setStatus] = React.useState<JobStatus>('Scheduled')
  const [scheduledDate, setScheduledDate] = React.useState('')
  const [startTime, setStartTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [overlapWarning, setOverlapWarning] = React.useState('')
  const [trialModalOpen, setTrialModalOpen] = React.useState(false)
  const [createdJob, setCreatedJob] = React.useState<CreatedJob | null>(null)

  // Success step reassign
  const [reassignTo, setReassignTo] = React.useState('')
  const [reassignSaving, setReassignSaving] = React.useState(false)

  // ─── Load data ─────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!organizationId) return
    Promise.all([
      supabase.from('customers').select('id, name, email, phone').eq('organization_id', organizationId).order('name'),
      supabase.from('organization_members').select('user_id, email, role').eq('organization_id', organizationId).eq('status', 'active').not('user_id', 'is', null),
    ]).then(([custRes, membersRes]) => {
      if (custRes.data) {
        setCustomers(custRes.data)
        const preId = searchParams.get('customerId')
        if (preId && custRes.data.some((c) => c.id === preId)) setCustomerId(preId)
      }
      if (membersRes.data) setTeamMembers(membersRes.data as TeamMember[])
    })
  }, [organizationId, searchParams])

  // ─── Overlap check ─────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!assignedTo || !scheduledDate || !organizationId) { setOverlapWarning(''); return }
    supabase
      .from('jobs')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('assigned_to', assignedTo)
      .eq('scheduled_date', scheduledDate)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const member = teamMembers.find((m) => m.user_id === assignedTo)
          const name = member ? member.email.split('@')[0] : 'This technician'
          setOverlapWarning(`${name} already has ${data.length} job${data.length > 1 ? 's' : ''} scheduled on that day.`)
        } else {
          setOverlapWarning('')
        }
      })
  }, [assignedTo, scheduledDate, organizationId, teamMembers])

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!trialAllowed) { setTrialModalOpen(true); return }
    if (!title.trim()) { setError('Title is required.'); return }
    if (!customerId) { setError('Please select a customer.'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setError('Please sign in and try again.'); return }
    if (!organizationId) { setSaving(false); setError('Organization not found — please refresh the page.'); return }

    const { data: newJob, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        title: title.trim(),
        customer_id: customerId,
        assigned_to: assignedTo || null,
        status,
        scheduled_date: scheduledDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        price: price !== '' ? parseFloat(price) : null,
        description: description.trim() || null,
        notes: notes.trim() || null,
      })
      .select('*, customers(name, email, phone)')
      .single()

    if (jobErr || !newJob) { setError(jobErr?.message ?? 'Failed to save job.'); setSaving(false); return }

    type JobRow = { id: string; job_number: number | null; title: string; scheduled_date: string | null; customers: { name?: string; email?: string | null; phone?: string | null } | null }
    const j = newJob as unknown as JobRow
    const cust = j.customers
    const jobData = { customerName: cust?.name, jobNumber: j.job_number, title: j.title, scheduledDate: j.scheduled_date ?? 'TBD' }

    if (cust?.email) await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: cust.email, type: 'job_confirmation', data: jobData }) }).catch(() => {})
    if (cust?.phone) await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: cust.phone, type: 'job_confirmation', data: jobData }) }).catch(() => {})

    const assigneeEmail = teamMembers.find((m) => m.user_id === assignedTo)?.email ?? null
    setSaving(false)
    setReassignTo(assignedTo)
    setCreatedJob({
      id: j.id,
      title: title.trim(),
      customerId: customerId || null,
      customerName: cust?.name ?? null,
      assignedTo: assignedTo || null,
      assigneeEmail,
      scheduledDate: scheduledDate || null,
    })
  }

  // ─── Reassign (success step) ───────────────────────────────────────────────

  const handleReassign = async () => {
    if (!createdJob) return
    setReassignSaving(true)
    const { error: err } = await supabase.from('jobs').update({ assigned_to: reassignTo || null }).eq('id', createdJob.id)
    if (!err) {
      const assigneeEmail = teamMembers.find((m) => m.user_id === reassignTo)?.email ?? null
      setCreatedJob({ ...createdJob, assignedTo: reassignTo || null, assigneeEmail })
    }
    setReassignSaving(false)
  }

  const resetForm = () => {
    setTitle(''); setCustomerId(''); setAssignedTo(''); setStatus('Scheduled')
    setScheduledDate(''); setStartTime(''); setEndTime(''); setPrice('')
    setDescription(''); setNotes(''); setCreatedJob(null); setError(''); setOverlapWarning('')
  }

  const canAssign = role === 'owner' || role === 'admin'

  // ─── Success step ──────────────────────────────────────────────────────────

  if (createdJob) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{createdJob.title}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 justify-center text-sm text-muted-foreground">
              {createdJob.customerName && <span>{createdJob.customerName}</span>}
              {createdJob.assigneeEmail && (
                <span>→ {createdJob.assigneeEmail.split('@')[0]}</span>
              )}
              {createdJob.scheduledDate && <span>{fmtDate(createdJob.scheduledDate)}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <a
              href={`/dashboard/estimates/new${createdJob.customerId ? `?customerId=${createdJob.customerId}` : ''}`}
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Create estimate for this job
            </a>

            {canAssign && (
              <div className="bg-muted/40 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm font-medium text-foreground">Assign or change technician</p>
                <div className="flex gap-2">
                  <NativeSelect
                    className="flex-1"
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.email.split('@')[0]} · {m.role}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReassign}
                    disabled={reassignSaving}
                    className="shrink-0"
                  >
                    {reassignSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            <a
              href={`/dashboard/jobs/${createdJob.id}`}
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              View job
            </a>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Add another job
          </button>
        </div>
      </div>
    )
  }

  // ─── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl mx-auto pb-28">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">New Job</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create and schedule a new job for a customer</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-5 flex flex-col gap-4">
          <Field label="Title" required>
            <Input
              placeholder="e.g. HVAC Maintenance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Customer" required>
            <NativeSelect value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Select a customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </Field>

          <Field label="Status">
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as JobStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </NativeSelect>
          </Field>

          {canAssign && (
            <Field label="Assign Technician">
              <NativeSelect value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.email} · {m.role}
                  </option>
                ))}
              </NativeSelect>
              {assignedTo && (
                <p className="text-xs text-muted-foreground mt-1">They&apos;ll see this job in their schedule.</p>
              )}
              {overlapWarning && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {overlapWarning}
                </p>
              )}
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Scheduled Date">
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </Field>
            <Field label="Price ($)">
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Start Time">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="End Time">
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={3}
              placeholder="Job description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-[12px] border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>

          <Field label="Internal Notes">
            <textarea
              rows={3}
              placeholder="Internal notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-[12px] border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs outline-none resize-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <TrialExpiredModal open={trialModalOpen} onClose={() => setTrialModalOpen(false)} />

      <div className="fixed bottom-0 left-60 right-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm px-8 py-4 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/dashboard/jobs')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || trialLoading}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
            : 'Create Job'}
        </Button>
      </div>
    </div>
  )
}

// ─── Local helpers ────────────────────────────────────────────────────────────

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

function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-[12px] border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
