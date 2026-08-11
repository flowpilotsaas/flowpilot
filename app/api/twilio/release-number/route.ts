import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  try {
    const { twilioSid, phoneNumberId } = await req.json()
    if (!twilioSid || !phoneNumberId) {
      return Response.json({ error: 'twilioSid and phoneNumberId are required.' }, { status: 400 })
    }

    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.incomingPhoneNumbers(twilioSid).remove()

    const { error: dbError } = await supabase
      .from('phone_numbers')
      .delete()
      .eq('id', phoneNumberId)
      .eq('user_id', user.id)
    if (dbError) console.error('[release-number] DB delete failed:', dbError.message)

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[release-number]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
