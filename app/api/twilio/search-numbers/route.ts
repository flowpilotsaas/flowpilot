import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const areaCode = req.nextUrl.searchParams.get('areaCode') ?? ''
  if (!/^\d{3}$/.test(areaCode)) {
    return Response.json({ error: 'Area code must be exactly 3 digits.' }, { status: 400 })
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return Response.json({ error: 'Twilio not configured.' }, { status: 500 })
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    const numbers = await client.availablePhoneNumbers('US').local.list({ areaCode: parseInt(areaCode, 10), limit: 5 })
    return Response.json({
      numbers: numbers.map((n) => ({ phoneNumber: n.phoneNumber, friendlyName: n.friendlyName })),
    })
  } catch (err) {
    console.error('[search-numbers]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
