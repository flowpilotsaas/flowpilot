import { NextRequest } from 'next/server'
import { parseTwilioWebhook } from '@/lib/twilio-validate'
import { createServiceSupabase } from '@/lib/supabase-service'

const STOP_WORDS  = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
const START_WORDS = new Set(['START', 'UNSTOP'])

export async function POST(req: NextRequest) {
  const params = await parseTwilioWebhook(req)
  if (!params) {
    return new Response('Forbidden', { status: 403 })
  }

  const from = params['From'] ?? ''
  const to   = params['To']   ?? ''
  const body = (params['Body'] ?? '').trim()

  const supabase = createServiceSupabase()

  // Find the org that owns the "To" number
  const { data: numRow } = await supabase
    .from('phone_numbers')
    .select('organization_id')
    .eq('phone_number', to)
    .maybeSingle()

  const orgId = numRow?.organization_id ?? null

  // Log inbound message if we can associate it with an org
  if (orgId) {
    // Look up customer by phone
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('phone', from)
      .maybeSingle()

    await supabase.from('text_messages').insert({
      organization_id: orgId,
      from_number:     from,
      to_number:       to,
      body,
      status:          'received',
      direction:       'inbound',
      customer_id:     customer?.id ?? null,
      customer_name:   customer?.name ?? null,
    })

    const keyword = body.toUpperCase()

    if (STOP_WORDS.has(keyword)) {
      await supabase.from('sms_opt_outs').upsert(
        { org_id: orgId, phone: from },
        { onConflict: 'org_id,phone', ignoreDuplicates: true },
      )
    } else if (START_WORDS.has(keyword)) {
      await supabase.from('sms_opt_outs')
        .delete()
        .eq('org_id', orgId)
        .eq('phone', from)
    }
  }

  // Respond with empty TwiML — Twilio expects XML
  return new Response('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
