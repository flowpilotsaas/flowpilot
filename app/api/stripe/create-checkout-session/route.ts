import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabase } from '@/lib/supabase-server'

const PLAN_PRICES: Record<string, number> = {
  Kickstart:    49,
  Standard:     99,
  Business:     149,
  Professional: 199,
  Growth:       299,
  Enterprise:   499,
}

export async function POST(req: NextRequest) {
  try {
    const { planName } = await req.json()
    const planPrice = PLAN_PRICES[planName]
    if (!planPrice) {
      return Response.json({ error: 'Invalid plan name.' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    // Get existing Stripe customer ID from DB
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id ?? null

    if (!customerId) {
      // Check Stripe by email to avoid duplicates
      const existing = await stripe.customers.list({ email: user.email!, limit: 1 })
      if (existing.data.length > 0) {
        customerId = existing.data[0].id
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: { user_id: user.id },
        })
        customerId = customer.id
      }
    }

    // Find or create product
    const productName = `PilotWork - ${planName}`
    const existingProducts = await stripe.products.search({
      query: `name:'${productName}' AND active:'true'`,
    })
    let productId: string
    if (existingProducts.data.length > 0) {
      productId = existingProducts.data[0].id
    } else {
      const product = await stripe.products.create({
        name: productName,
        metadata: { plan: planName },
      })
      productId = product.id
    }

    // Find or create price
    const existingPrices = await stripe.prices.list({ product: productId, active: true, type: 'recurring' })
    const matchingPrice = existingPrices.data.find(
      (p) => p.unit_amount === planPrice * 100 && p.recurring?.interval === 'month',
    )
    let priceId: string
    if (matchingPrice) {
      priceId = matchingPrice.id
    } else {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: planPrice * 100,
        currency: 'usd',
        recurring: { interval: 'month' },
      })
      priceId = price.id
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing`,
      metadata: { user_id: user.id, plan_name: planName },
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout-session]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
