import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mem } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!mem) return Response.json({ error: 'No organization found.' }, { status: 403 })

  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET || !TWILIO_TWIML_APP_SID) {
    return Response.json({ error: 'Twilio Voice not configured.' }, { status: 500 })
  }

  try {
    const { default: twilio } = await import('twilio')
    const { AccessToken } = (twilio as unknown as { jwt: { AccessToken: typeof import('twilio').jwt.AccessToken } }).jwt
    const VoiceGrant = AccessToken.VoiceGrant

    const identity = `org_${mem.organization_id}_user_${user.id}`

    const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, {
      identity,
      ttl: 3600,
    })

    const grant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_TWIML_APP_SID,
      incomingAllow: true,
    })
    token.addGrant(grant)

    return Response.json({ token: token.toJwt(), identity })
  } catch (err) {
    console.error('[voice-token]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
