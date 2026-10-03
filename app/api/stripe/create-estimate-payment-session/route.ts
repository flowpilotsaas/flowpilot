import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createEstimatePaymentSession } from '@/lib/stripe-estimate-session'

export async function POST(req: NextRequest) {
  try {
    const { estimateId } = await req.json()
    if (!estimateId) {
      return Response.json({ error: 'estimateId is required.' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: estimate } = await supabase
      .from('estimates')
      .select('id, estimate_number, customer_name, customer_email, total')
      .eq('id', estimateId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!estimate) {
      return Response.json({ error: 'Estimate not found.' }, { status: 404 })
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'
    const url = await createEstimatePaymentSession({
      estimate,
      successUrl: `${origin}/dashboard/estimates/${estimateId}?payment=success`,
      cancelUrl: `${origin}/dashboard/estimates/${estimateId}`,
      userId: user.id,
    })

    await supabase
      .from('estimates')
      .update({ payment_link_url: url, payment_link_status: 'sent' })
      .eq('id', estimateId)

    return Response.json({ url })
  } catch (err) {
    console.error('[create-estimate-payment-session]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
