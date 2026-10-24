import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { checkWriteAccess } from '@/lib/trial-gate'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await checkWriteAccess(supabase, user.id)
  if (!access.allowed) {
    return Response.json({ error: access.message, code: access.code }, { status: 402 })
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return Response.json({ error: 'No organization found.' }, { status: 403 })
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return Response.json({ error: 'Only owners and admins can buy phone numbers.' }, { status: 403 })
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  try {
    const { phoneNumber } = await req.json()
    if (!phoneNumber) return Response.json({ error: 'phoneNumber is required.' }, { status: 400 })

    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const purchased = await client.incomingPhoneNumbers.create({ phoneNumber })

    const { error: dbError } = await supabase.from('phone_numbers').insert({
      user_id:         user.id,
      organization_id: membership.organization_id,
      phone_number:    purchased.phoneNumber,
      friendly_name:   purchased.friendlyName,
      twilio_sid:      purchased.sid,
    })
    if (dbError) console.error('[buy-number] DB insert failed:', dbError.message)

    return Response.json({
      phoneNumber:  purchased.phoneNumber,
      friendlyName: purchased.friendlyName,
      twilioSid:    purchased.sid,
    })
  } catch (err) {
    console.error('[buy-number]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
