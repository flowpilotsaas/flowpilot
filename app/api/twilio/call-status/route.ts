import { NextRequest } from 'next/server'
import { parseTwilioWebhook } from '@/lib/twilio-validate'
import { createServiceSupabase } from '@/lib/supabase-service'

function normalizePhone(p: string) { return p.replace(/\D/g, '').slice(-10) }

export async function POST(req: NextRequest) {
  const params = await parseTwilioWebhook(req)
  if (!params) return new Response('Forbidden', { status: 403 })

  const { CallSid, DialCallSid, DialCallDuration, Duration, From, To, CallStatus } = params

  // Determine the duration to record (Dial action gives DialCallDuration; status callback gives Duration)
  const durationSeconds = parseInt(DialCallDuration ?? Duration ?? '0', 10) || null

  // Identify the org by matching the phone number involved (From or To) against phone_numbers
  const db = createServiceSupabase()
  const numbers = [From, To].filter(Boolean).map(normalizePhone)
  let orgId: string | null = null

  for (const num of numbers) {
    const { data } = await db
      .from('phone_numbers')
      .select('organization_id')
      .filter('phone_number', 'ilike', `%${num}`)
      .maybeSingle()
    if (data) { orgId = data.organization_id; break }
  }

  if (!orgId || !CallSid) {
    // Not our number — still return 204 so Twilio doesn't retry
    return new Response(null, { status: 204 })
  }

  // Upsert into call_recordings (may already exist from recording-status)
  await db.from('call_recordings').upsert({
    call_sid:         DialCallSid ?? CallSid,
    org_id:           orgId,
    duration_seconds: durationSeconds,
    call_status:      CallStatus ?? null,
  }, { onConflict: 'call_sid', ignoreDuplicates: false })

  return new Response(null, { status: 204 })
}
