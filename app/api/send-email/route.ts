import { NextRequest } from 'next/server'
import { sendNotificationEmail, EMAIL_TEMPLATES } from '@/lib/send-notification-email'

export async function POST(req: NextRequest) {
  console.log('[send-email] POST hit')
  console.log('[send-email] RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'present, length: ' + process.env.RESEND_API_KEY.length : 'MISSING')

  if (!process.env.RESEND_API_KEY) {
    console.error('[send-email] FATAL: RESEND_API_KEY is not set.')
    return Response.json({ error: 'Email not configured — missing RESEND_API_KEY.' }, { status: 500 })
  }

  try {
    const { to, type, data } = await req.json()
    console.log('[send-email] to:', to, '| type:', type)

    if (!to || !type || !EMAIL_TEMPLATES[type]) {
      console.error('[send-email] Missing/invalid fields — to:', to, 'type:', type)
      return Response.json({ error: 'Missing or invalid fields.' }, { status: 400 })
    }

    const result = await sendNotificationEmail({ to, type, data })

    if (!result.ok) {
      console.error('[send-email] Resend error:', result.error)
      return Response.json({ error: result.error }, { status: 500 })
    }

    console.log('[send-email] Resend success. id:', result.id)
    return Response.json({ ok: true, id: result.id })
  } catch (err) {
    const e = err as Error
    console.error('[send-email] Unexpected error:', e.name, e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
