import { NextRequest } from 'next/server'
import { parseTwilioWebhook } from '@/lib/twilio-validate'
import { createServiceSupabase } from '@/lib/supabase-service'
import { getAppUrl } from '@/lib/app-url'

function normalizePhone(p: string) { return p.replace(/\D/g, '').slice(-10) }

export async function POST(req: NextRequest) {
  const params = await parseTwilioWebhook(req)
  if (!params) return new Response('Forbidden', { status: 403 })

  const { To, From, Caller } = params
  if (!To || !From) {
    return xmlResponse('<Response><Say>Missing call parameters.</Say></Response>')
  }

  // Parse orgId from identity  "client:org_<orgId>_user_<userId>"
  const match = (Caller ?? '').match(/org_([^_]+(?:_[^_]+)*?)_user_/)
  const orgId = match?.[1]
  if (!orgId) {
    return xmlResponse('<Response><Say>Caller identity not recognised.</Say></Response>')
  }

  // Verify From number belongs to this org
  const db = createServiceSupabase()
  const { data: numRow } = await db
    .from('phone_numbers')
    .select('id')
    .eq('organization_id', orgId)
    .filter('phone_number', 'ilike', `%${normalizePhone(From)}`)
    .maybeSingle()

  if (!numRow) {
    return xmlResponse('<Response><Say>Calling number not authorised for this account.</Say></Response>')
  }

  const appUrl = getAppUrl()
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${From}"
        record="record-from-answer-dual"
        recordingStatusCallback="${appUrl}/api/twilio/recording-status"
        recordingStatusCallbackMethod="POST"
        action="${appUrl}/api/twilio/call-status"
        method="POST">
    <Number>${To}</Number>
  </Dial>
</Response>`

  return xmlResponse(twiml)
}

function xmlResponse(body: string) {
  return new Response(body, { headers: { 'Content-Type': 'text/xml; charset=utf-8' } })
}
