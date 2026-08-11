import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const calls = await client.calls.list({ limit: 50 })
    return Response.json({
      calls: calls.map((c) => ({
        sid:       c.sid,
        status:    c.status,
        from:      c.from,
        to:        c.to,
        startTime: c.startTime,
        duration:  c.duration,
      })),
    })
  } catch (err) {
    console.error('[list-calls]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
