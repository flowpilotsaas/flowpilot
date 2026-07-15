import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabase } from '@/lib/supabase-server'

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

    const amountCents = Math.round(estimate.total * 100)
    if (amountCents < 50) {
      return Response.json({ error: 'Estimate total is too small to process a payment.' }, { status: 400 })
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'
    const estimateLabel = `EST-${String(estimate.estimate_number).padStart(4, '0')}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: estimate.customer_email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: estimateLabel,
              ...(estimate.customer_name && { description: `Payment for ${estimate.customer_name}` }),
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/estimates/${estimateId}?payment=success`,
      cancel_url: `${origin}/dashboard/estimates/${estimateId}`,
      metadata: {
        type: 'estimate_payment',
        estimate_id: estimateId,
        user_id: user.id,
        customer_name: estimate.customer_name ?? '',
        customer_email: estimate.customer_email ?? '',
      },
    })

    await supabase
      .from('estimates')
      .update({ payment_link_url: session.url, payment_link_status: 'sent' })
      .eq('id', estimateId)

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[create-estimate-payment-session]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
