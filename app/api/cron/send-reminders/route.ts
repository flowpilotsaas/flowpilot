import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron (or an authorized caller)
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  // Find jobs scheduled within the next 48 hours that haven't had a reminder sent.
  // Window is 48h (not 24h) because this cron runs once daily — a wider window ensures
  // nothing is missed if a job falls just outside a 24h window between runs.
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const todayStr = now.toISOString().split('T')[0]
  const in48hStr = in48h.toISOString().split('T')[0]

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_number, title, scheduled_date, organization_id, customers(name, email, phone), organizations(company_name)')
    .gte('scheduled_date', todayStr)
    .lte('scheduled_date', in48hStr)
    .is('reminder_sent_at', null)
    .not('status', 'in', '("Completed","Cancelled")')

  if (error) {
    console.error('[send-reminders] DB query error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }

  console.log('[send-reminders] Jobs to remind:', jobs?.length ?? 0)

  const results: { jobId: string; email?: string; sms?: string }[] = []

  for (const job of jobs ?? []) {
    const customersArr = job.customers as { name: string; email: string | null; phone: string | null }[] | null
    const customer = Array.isArray(customersArr) ? customersArr[0] ?? null : null
    const orgsArr = job.organizations as { company_name: string | null }[] | null
    const org = Array.isArray(orgsArr) ? orgsArr[0] ?? null : null

    if (!customer?.email && !customer?.phone) continue

    const reminderData = {
      customerName: customer?.name ?? 'there',
      jobNumber:    job.job_number,
      title:        job.title,
      scheduledDate: job.scheduled_date,
      companyName:  org?.company_name ?? 'Your service provider',
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const result: { jobId: string; email?: string; sms?: string } = { jobId: job.id }

    const internalHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
    }

    // Send email reminder
    if (customer?.email) {
      try {
        const r = await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({ to: customer.email, type: 'job_reminder', data: reminderData }),
        })
        result.email = r.ok ? 'sent' : `failed (${r.status})`
        if (!r.ok) console.error('[send-reminders] Email failed for job', job.id, ':', await r.text().catch(() => ''))
      } catch (err) {
        result.email = 'network error'
        console.error('[send-reminders] Email network error for job', job.id, ':', (err as Error).message)
      }
    }

    // Send SMS reminder
    if (customer?.phone) {
      try {
        const r = await fetch(`${baseUrl}/api/send-sms`, {
          method: 'POST',
          headers: internalHeaders,
          body: JSON.stringify({ to: customer.phone, type: 'job_reminder', data: reminderData }),
        })
        result.sms = r.ok ? 'sent' : `failed (${r.status})`
        if (!r.ok) console.error('[send-reminders] SMS failed for job', job.id, ':', await r.text().catch(() => ''))
      } catch (err) {
        result.sms = 'network error'
        console.error('[send-reminders] SMS network error for job', job.id, ':', (err as Error).message)
      }
    }

    // Mark reminder sent regardless of individual channel failures —
    // avoids flooding customers if one channel consistently fails
    if (result.email || result.sms) {
      const { error: updateErr } = await supabase
        .from('jobs')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', job.id)
      if (updateErr) {
        console.error('[send-reminders] Failed to mark reminder_sent_at for job', job.id, ':', updateErr.message)
      }
    }

    results.push(result)
  }

  console.log('[send-reminders] Done. Results:', JSON.stringify(results))
  return Response.json({ processed: results.length, results })
}
