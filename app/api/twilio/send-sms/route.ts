import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  try {
    const { to, body, customerId, customerName } = await req.json()
    if (!to || !body?.trim()) {
      return Response.json({ error: 'to and body are required.' }, { status: 400 })
    }

    const normalized = toE164(to)
    if (!normalized) {
      return Response.json({ error: `Invalid phone number: ${to}` }, { status: 400 })
    }

    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const msg = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   normalized,
      body: body.trim(),
    })

    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    await supabase.from('text_messages').insert({
      user_id:       user.id,
      to_number:     normalized,
      from_number:   fromNumber,
      body:          body.trim(),
      status:        msg.status,
      twilio_sid:    msg.sid,
      customer_id:   customerId ?? null,
      customer_name: customerName ?? null,
    })

    return Response.json({ ok: true, sid: msg.sid })
  } catch (err) {
    console.error('[twilio/send-sms]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
