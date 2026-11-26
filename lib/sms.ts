import { createServiceSupabase } from './supabase-service'
import { twilioClient } from './twilio'

function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export type SendOrgSmsParams = {
  orgId: string
  to: string
  body: string
  customerId?: string | null
  customerName?: string | null
  type?: string | null
}

export type SendOrgSmsResult =
  | { ok: true; sid: string }
  | { skipped: 'opt_out' }
  | { ok: false; error: string }

export async function sendOrgSms(params: SendOrgSmsParams): Promise<SendOrgSmsResult> {
  const { orgId, to, body, customerId, customerName } = params

  try {
    if (body.length > 1000) return { ok: false, error: 'Message body exceeds 1000 characters.' }

    const normalized = toE164(to)
    if (!normalized) return { ok: false, error: `Invalid phone number: ${to}` }

    const supabase = createServiceSupabase()

    // Pick org's own purchased number; fallback to env var
    const { data: numRow } = await supabase
      .from('phone_numbers')
      .select('phone_number')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const fromNumber = numRow?.phone_number ?? process.env.TWILIO_PHONE_NUMBER
    if (!fromNumber) return { ok: false, error: 'No sending number available.' }

    // Skip if phone is in opt-out list
    const { data: optOut } = await supabase
      .from('sms_opt_outs')
      .select('phone')
      .eq('org_id', orgId)
      .eq('phone', normalized)
      .maybeSingle()
    if (optOut) return { skipped: 'opt_out' }

    const msg = await twilioClient.messages.create({
      from: fromNumber,
      to:   normalized,
      body: body.trim(),
    })

    await supabase.from('text_messages').insert({
      organization_id: orgId,
      to_number:       normalized,
      from_number:     fromNumber,
      body:            body.trim(),
      status:          msg.status,
      twilio_sid:      msg.sid,
      customer_id:     customerId ?? null,
      customer_name:   customerName ?? null,
      direction:       'outbound',
    })

    return { ok: true, sid: msg.sid }
  } catch (err) {
    console.error('[sendOrgSms]', err)
    return { ok: false, error: (err as Error).message }
  }
}
