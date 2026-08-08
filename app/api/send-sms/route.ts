import { NextRequest } from 'next/server'

// ─── Phone normalizer ───────────────────────────────────────────────────────

function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

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
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log('[send-sms] POST hit')
  console.log('[send-sms] TWILIO_ACCOUNT_SID present:', !!process.env.TWILIO_ACCOUNT_SID)
  console.log('[send-sms] TWILIO_PHONE_NUMBER present:', !!process.env.TWILIO_PHONE_NUMBER)

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error('[send-sms] FATAL: Twilio env vars missing. Restart dev server after adding to .env.local.')
    return Response.json({ error: 'SMS not configured.' }, { status: 500 })
  }

  try {
    const { to, type, data } = await req.json()
    console.log('[send-sms] to:', to, '| type:', type)

    if (!to || !type || !TEMPLATES[type]) {
      console.error('[send-sms] Missing/invalid fields — to:', to, 'type:', type)
      return Response.json({ error: 'Missing or invalid fields.' }, { status: 400 })
    }

    const normalized = toE164(to)
    if (!normalized) {
      console.error('[send-sms] Could not normalize phone number:', to)
      return Response.json({ error: `Invalid phone number: ${to}` }, { status: 400 })
    }

    const body = TEMPLATES[type](data ?? {})
    console.log('[send-sms] message body:', body)

    // Dynamic import avoids module-level init with undefined env vars
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    const msg = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   normalized,
      body,
    })

    console.log('[send-sms] Twilio success. SID:', msg.sid)
    return Response.json({ ok: true, sid: msg.sid })
  } catch (err) {
    const e = err as Error
    console.error('[send-sms] Error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
