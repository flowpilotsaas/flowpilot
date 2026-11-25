import { NextRequest } from 'next/server'
import { parseTwilioWebhook } from '@/lib/twilio-validate'

export async function POST(req: NextRequest) {
  const params = await parseTwilioWebhook(req)
  if (!params) return new Response('Forbidden', { status: 403 })

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thanks for calling. Please leave a message after the tone.</Say>
  <Record maxLength="120" playBeep="true" />
</Response>`

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml; charset=utf-8' } })
}
