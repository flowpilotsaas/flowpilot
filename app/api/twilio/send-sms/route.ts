import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { checkWriteAccess } from '@/lib/trial-gate'
import { sendOrgSms } from '@/lib/sms'

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
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) return Response.json({ error: 'No organization found.' }, { status: 403 })

  try {
    const { to, body, customerId, customerName } = await req.json()
    if (!to || !body?.trim()) {
      return Response.json({ error: 'to and body are required.' }, { status: 400 })
    }

    const result = await sendOrgSms({
      orgId:        membership.organization_id,
      to,
      body,
      customerId:   customerId ?? null,
      customerName: customerName ?? null,
    })

    if ('skipped' in result) return Response.json({ ok: true, skipped: result.skipped })
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 })
    return Response.json({ ok: true, sid: result.sid })
  } catch (err) {
    console.error('[twilio/send-sms]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
