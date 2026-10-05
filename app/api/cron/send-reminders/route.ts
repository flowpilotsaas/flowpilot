import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendNotificationEmail } from '@/lib/send-notification-email'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  const now   = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const todayStr = now.toISOString().split('T')[0]
  const in48hStr = in48h.toISOString().split('T')[0]

  // Supabase many-to-one joins (jobs.customer_id → customers, jobs.organization_id → organizations)
  // return a single OBJECT per row, not an array.
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_number, title, scheduled_date, organization_id, customers(name, email, phone), organizations(name)')
    .gte('scheduled_date', todayStr)
    .lte('scheduled_date', in48hStr)
    .is('reminder_sent_at', null)
    .not('status', 'in', '("Completed","Cancelled")')

  if (error) {
    console.error('[send-reminders] DB query error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  const found = jobs?.length ?? 0
  console.log('[send-reminders] Jobs to remind:', found)

  type JobResult = { jobId: string; email?: string; sms?: string }
  const results: JobResult[] = []
  const allErrors: { jobId: string; errors: string[] }[] = []

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const internalHeaders = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${process.env.CRON_SECRET}`,
  }

  for (const job of jobs ?? []) {
    type Customer = { name: string; email: string | null; phone: string | null }
    type Org      = { name: string | null }
    const customer = one(job.customers as unknown as Customer | Customer[] | null)
    const org      = one(job.organizations as unknown as Org | Org[] | null)

    if (!customer?.email && !customer?.phone) {
      console.log('[send-reminders] Skipping job', job.id, '— no customer contact info')
      continue
    }

    const reminderData = {
      customerName:  customer?.name ?? 'there',
      jobNumber:     job.job_number,
      title:         job.title,
      scheduledDate: job.scheduled_date,
      companyName:   org?.name ?? 'Your service provider',
    }

    let emailSent = false
    let smsSent   = false
    const jobErrors: string[] = []
    const result: JobResult = { jobId: job.id }

    // ── Email (direct call — no internal HTTP round-trip) ──────────────────
    if (customer?.email) {
      try {
        const { ok, id, error: emailErr } = await sendNotificationEmail({
          to:   customer.email,
          type: 'job_reminder',
          data: reminderData,
        })
        if (ok) {
          emailSent = true
          result.email = `sent (id: ${id ?? 'unknown'})`
          console.log('[send-reminders] Email sent for job', job.id, '— Resend id:', id)
        } else {
          result.email = `failed: ${emailErr}`
          jobErrors.push(`email: ${emailErr}`)
          console.error('[send-reminders] Email failed for job', job.id, ':', emailErr)
        }
      } catch (err) {
        const msg = (err as Error).message
        result.email = `error: ${msg}`
        jobErrors.push(`email threw: ${msg}`)
        console.error('[send-reminders] Email threw for job', job.id, ':', msg)
      }
    }

    // ── SMS (HTTP to /api/send-sms which has auth + Twilio logic) ──────────
    if (customer?.phone) {
      try {
        const r = await fetch(`${baseUrl}/api/send-sms`, {
          method:  'POST',
          headers: internalHeaders,
          body:    JSON.stringify({ to: customer.phone, type: 'job_reminder', data: reminderData }),
        })
        if (r.ok) {
          smsSent = true
          result.sms = 'sent'
          console.log('[send-reminders] SMS sent for job', job.id)
        } else {
          const body = await r.text().catch(() => '')
          result.sms = `failed (${r.status})`
          jobErrors.push(`sms (${r.status}): ${body}`)
          console.error('[send-reminders] SMS failed for job', job.id, `— status ${r.status}:`, body)
        }
      } catch (err) {
        const msg = (err as Error).message
        result.sms = `error: ${msg}`
        jobErrors.push(`sms threw: ${msg}`)
        console.error('[send-reminders] SMS threw for job', job.id, ':', msg)
      }
    }

    // ── Only stamp if at least one channel confirmed delivery ──────────────
    if (emailSent || smsSent) {
      const { error: updateErr } = await supabase
        .from('jobs')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', job.id)
      if (updateErr) {
        console.error('[send-reminders] Failed to set reminder_sent_at for job', job.id, ':', updateErr.message)
        jobErrors.push(`stamp: ${updateErr.message}`)
      }
    } else {
      console.warn('[send-reminders] No channel succeeded for job', job.id, '— will retry next run')
    }

    results.push(result)
    if (jobErrors.length) allErrors.push({ jobId: job.id, errors: jobErrors })
  }

  const sent   = results.filter(r => r.email?.startsWith('sent') || r.sms === 'sent').length
  const failed = results.length - sent

  console.log('[send-reminders] Done — found:', found, 'sent:', sent, 'failed:', failed)
  return Response.json({ found, sent, failed, errors: allErrors.length ? allErrors : undefined })
}
