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
    return Response.json({ error: 'Only owners and admins can release phone numbers.' }, { status: 403 })
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  try {
    const { phoneNumberId } = await req.json()
    if (!phoneNumberId) {
      return Response.json({ error: 'phoneNumberId is required.' }, { status: 400 })
    }

    // Look up the row by id + org — never trust twilioSid from the request
    const { data: row } = await supabase
      .from('phone_numbers')
      .select('twilio_sid')
      .eq('id', phoneNumberId)
      .eq('organization_id', membership.organization_id)
      .maybeSingle()
    if (!row) return Response.json({ error: 'Phone number not found.' }, { status: 404 })

    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.incomingPhoneNumbers(row.twilio_sid).remove()

    const { error: dbError } = await supabase
      .from('phone_numbers')
      .delete()
      .eq('id', phoneNumberId)
      .eq('organization_id', membership.organization_id)
    if (dbError) console.error('[release-number] DB delete failed:', dbError.message)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[release-number]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
