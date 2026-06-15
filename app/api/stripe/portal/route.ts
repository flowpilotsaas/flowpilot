import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!sub?.stripe_customer_id) {
      return Response.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 400 },
      )
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[portal]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
