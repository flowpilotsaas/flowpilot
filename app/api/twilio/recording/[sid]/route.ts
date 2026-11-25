import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sid: string }> },
) {
  const { sid } = await params

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mem } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!mem) return Response.json({ error: 'No organization.' }, { status: 403 })

  // Verify the recording belongs to this org
  const { data: row } = await supabase
    .from('call_recordings')
    .select('recording_sid, recording_url')
    .eq('recording_sid', sid)
    .eq('org_id', mem.organization_id)
    .maybeSingle()

  if (!row?.recording_sid) {
    return Response.json({ error: 'Recording not found.' }, { status: 404 })
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  // Fetch the .mp3 from Twilio using HTTP Basic auth
  const mp3Url = row.recording_url
    ? `${row.recording_url}.mp3`
    : `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${row.recording_sid}.mp3`

  const upstream = await fetch(mp3Url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
    },
  })

  if (!upstream.ok) {
    return Response.json({ error: 'Failed to fetch recording.' }, { status: upstream.status })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${row.recording_sid}.mp3"`,
    },
  })
}
