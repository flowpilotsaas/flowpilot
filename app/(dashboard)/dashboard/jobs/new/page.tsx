'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { TrialExpiredModal } from '@/components/TrialExpiredModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Customer = { id: string; name: string; email: string | null; phone: string | null }
type JobStatus = 'Scheduled' | 'In Progress' | 'Completed'

const STATUSES: JobStatus[] = ['Scheduled', 'In Progress', 'Completed']

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { organizationId } = useOrganization()
  const { isAllowed: trialAllowed, isLoading: trialLoading } = useTrialStatus()

  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState('')
  const [status, setStatus] = React.useState<JobStatus>('Scheduled')
  const [scheduledDate, setScheduledDate] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [trialModalOpen, setTrialModalOpen] = React.useState(false)

  React.useEffect(() => {
    if (!organizationId) return
    supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('organization_id', organizationId)
      .order('name')
      .then(({ data }) => {
        if (!data) return
        setCustomers(data)
        const preId = searchParams.get('customerId')
        if (preId && data.some((c) => c.id === preId)) setCustomerId(preId)
      })
  }, [organizationId, searchParams])

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
        status,
        scheduled_date: scheduledDate || null,
        price: price !== '' ? parseFloat(price) : null,
        description: description.trim() || null,
        notes: notes.trim() || null,
      })
      .select('*, customers(name, email, phone)')
      .single()

    if (jobErr || !newJob) { setError(jobErr?.message ?? 'Failed to save job.'); setSaving(false); return }

    // Send job confirmation notifications
    const jobData = {
      customerName: (newJob as { customers?: { name?: string } }).customers?.name,
      jobNumber: (newJob as { job_number?: number }).job_number,
      title: (newJob as { title: string }).title,
      scheduledDate: (newJob as { scheduled_date?: string | null }).scheduled_date ?? 'TBD',
    }
    const cust = (newJob as { customers?: { email?: string | null; phone?: string | null } }).customers
    if (cust?.email) {
      await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: cust.email, type: 'job_confirmation', data: jobData }) }).catch(() => {})
    }
    if (cust?.phone) {
      await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: cust.phone, type: 'job_confirmation', data: jobData }) }).catch(() => {})
    }

    setSaving(false)
    router.push('/dashboard/jobs')
  }

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Scheduled Date">
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </Field>
            <Field label="Price ($)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
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
