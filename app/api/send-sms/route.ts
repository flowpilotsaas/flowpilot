import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { checkWriteAccess } from '@/lib/trial-gate'
import { sendOrgSms } from '@/lib/sms'

// ─── SMS templates ──────────────────────────────────────────────────────────

const TEMPLATES: Record<string, (d: Record<string, unknown>) => string> = {
  estimate_sent(d) {
    const name = d.customerName ?? 'there'
    const amount = d.total != null ? `$${Number(d.total).toFixed(2)}` : null
    const link = d.payUrl as string | undefined
    const amountPart = amount ? ` for ${amount}` : ''
    const linkPart = link ? ` Review and pay here: ${link}` : ''
    return `Hi ${name}, your service provider sent you an estimate${amountPart}.${linkPart} Reply STOP to opt out.`
  },

  job_confirmation(d) {
    const name = d.customerName ?? 'there'
    const title = d.title ?? 'your job'
    const date = d.scheduledDate ?? 'TBD'
    return `Hi ${name}, your job '${title}' is confirmed for ${date}. We'll see you then! Reply STOP to opt out.`
  },

  job_completion(d) {
    const name = d.customerName ?? 'there'
    const title = d.title ?? 'your service'
    return `Hi ${name}, your service '${title}' is complete. Thank you for choosing us!`
  },

  payment_received(d) {
    const name = d.customerName ?? 'there'
    const amount = d.amount != null ? `$${Number(d.amount).toFixed(2)}` : 'your payment'
    return `Hi ${name}, we received your payment of ${amount}. Thank you!`
  },

  payment_link_sent(d) {
    const name = d.customerName ?? 'there'
    const link = d.payUrl as string ?? ''
    return `Hi ${name}, your payment link is ready: ${link} Reply STOP to opt out.`
  },

  job_reminder(d) {
    const name = d.customerName ?? 'there'
    const title = d.title ?? 'your job'
    const date = d.scheduledDate ?? 'soon'
    return `Hi ${name}, reminder: '${title}' is scheduled for ${date}. Contact us if you need to reschedule. Reply STOP to opt out.`
  },
}

// ─── Route Handler — requires an authenticated, active org member ───────────

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await checkWriteAccess(supabase, user.id)
  if (!access.allowed) {
    return Response.json({ error: access.message, code: access.code }, { status: 402 })
  }

  const { data: mem } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!mem) return Response.json({ error: 'No organization found.' }, { status: 403 })

  try {
    const { to, type, data, customerId, customerName } = await req.json()

    if (!to || !type || !TEMPLATES[type]) {
      return Response.json({ error: 'Missing or invalid fields.' }, { status: 400 })
    }

    const body = TEMPLATES[type](data ?? {})
    const result = await sendOrgSms({
      orgId:        mem.organization_id,
      to,
      body,
      customerId:   customerId ?? null,
      customerName: customerName ?? null,
      type,
    })

    if ('skipped' in result) return Response.json({ ok: true, skipped: result.skipped })
    if (!result.ok) return Response.json({ error: result.error }, { status: 500 })
    return Response.json({ ok: true, sid: result.sid })
  } catch (err) {
    console.error('[send-sms]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
