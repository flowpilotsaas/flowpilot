import { NextRequest } from 'next/server'
import { parseTwilioWebhook } from '@/lib/twilio-validate'
import { createServiceSupabase } from '@/lib/supabase-service'

function normalizePhone(p: string) { return p.replace(/\D/g, '').slice(-10) }

export async function POST(req: NextRequest) {
  const params = await parseTwilioWebhook(req)
  if (!params) return new Response('Forbidden', { status: 403 })

  const { CallSid, RecordingSid, RecordingUrl, RecordingDuration, RecordingStatus } = params

  if (!CallSid || RecordingStatus !== 'completed') {
    return new Response(null, { status: 204 })
  }

  const db = createServiceSupabase()

  // Try to find org from an existing call_recordings row for this call
  const { data: existing } = await db
    .from('call_recordings')
    .select('org_id')
    .eq('call_sid', CallSid)
    .maybeSingle()

  let orgId: string | null = existing?.org_id ?? null

  // If not found yet, look up org from the From/To numbers in the params
  if (!orgId) {
    const numbers = [params.From, params.To].filter(Boolean).map(normalizePhone)
    for (const num of numbers) {
      const { data } = await db
        .from('phone_numbers')
        .select('organization_id')
        .filter('phone_number', 'ilike', `%${num}`)
        .maybeSingle()
      if (data) { orgId = data.organization_id; break }
    }
  }

  if (!orgId) return new Response(null, { status: 204 })

  await db.from('call_recordings').upsert({
    call_sid:         CallSid,
    org_id:           orgId,
    recording_sid:    RecordingSid ?? null,
    recording_url:    RecordingUrl ?? null,
    duration_seconds: parseInt(RecordingDuration ?? '0', 10) || null,
  }, { onConflict: 'call_sid', ignoreDuplicates: false })

  return new Response(null, { status: 204 })
}
