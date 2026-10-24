import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return Response.json({ error: 'No organization found.' }, { status: 403 })

  const { data: numbers } = await supabase
    .from('phone_numbers')
    .select('phone_number')
    .eq('organization_id', membership.organization_id)

  if (!numbers || numbers.length === 0) {
    return Response.json({ calls: [] })
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    const seen = new Set<string>()
    const allCalls: { sid: string; status: string; from: string; to: string; startTime: Date | null; duration: string }[] = []

    for (const num of numbers) {
      const [outbound, inbound] = await Promise.all([
        client.calls.list({ from: num.phone_number, limit: 25 }),
        client.calls.list({ to: num.phone_number, limit: 25 }),
      ])
      for (const c of [...outbound, ...inbound]) {
        if (!seen.has(c.sid)) {
          seen.add(c.sid)
          allCalls.push({ sid: c.sid, status: c.status, from: c.from, to: c.to, startTime: c.startTime, duration: c.duration })
        }
      }
    }

    allCalls.sort((a, b) => (b.startTime?.getTime() ?? 0) - (a.startTime?.getTime() ?? 0))

    return Response.json({ calls: allCalls.slice(0, 50) })
  } catch (err) {
    console.error('[list-calls]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
