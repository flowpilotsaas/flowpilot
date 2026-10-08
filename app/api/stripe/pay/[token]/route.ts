import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-service'
import { stripe } from '@/lib/stripe'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const supabase  = createServiceSupabase()
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // ── 1. Look up estimate by public token ────────────────────────────────
    const { data: estimate } = await supabase
      .from('estimates')
      .select('id, estimate_number, total, customer_email, customer_name, organization_id, status, payment_link_status')
      .eq('public_token', token)
      .maybeSingle()

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found.' }, { status: 404 })
    }
    if (estimate.status !== 'Approved' && estimate.status !== 'Accepted') {
      return NextResponse.json({ error: 'Estimate is not approved.' }, { status: 409 })
    }
    if (estimate.payment_link_status === 'paid') {
      return NextResponse.json({ error: 'This estimate has already been paid.' }, { status: 409 })
    }

    // ── 2. Require connected Stripe account with charges enabled ───────────
    const { data: stripeRow } = await supabase
      .from('organization_stripe_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('organization_id', estimate.organization_id)
      .maybeSingle()

    if (!stripeRow?.stripe_account_id || !stripeRow.charges_enabled) {
      return NextResponse.json(
        { error: 'This business has not set up Stripe Payments. Please contact them directly to arrange payment.' },
        { status: 409 },
      )
    }

    const stripeAccountId = stripeRow.stripe_account_id
    const amountCents     = Math.round(estimate.total * 100)
    const estimateLabel   = `EST-${String(estimate.estimate_number).padStart(4, '0')}`

    // ── 3. Optional application fee ────────────────────────────────────────
    const feeRate   = parseFloat(process.env.STRIPE_APPLICATION_FEE_RATE ?? '0')
    const feeAmount = feeRate > 0 ? Math.round(amountCents * feeRate) : 0

    // ── 4. Create Checkout Session on the connected account ────────────────
    const session = await stripe.checkout.sessions.create(
      {
        mode:           'payment',
        customer_email: estimate.customer_email ?? undefined,
        line_items: [
          {
            price_data: {
              currency:     'usd',
              unit_amount:  amountCents,
              product_data: {
                name: estimateLabel,
                ...(estimate.customer_name && {
                  description: `Payment for ${estimate.customer_name}`,
                }),
              },
            },
            quantity: 1,
          },
        ],
        ...(feeAmount > 0 && {
          payment_intent_data: { application_fee_amount: feeAmount },
        }),
        // {CHECKOUT_SESSION_ID} is a Stripe template variable — replaced on redirect
        success_url: `${appUrl}/e/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${appUrl}/e/${token}`,
        metadata: {
          estimate_id: estimate.id,
          org_id:      estimate.organization_id,
        },
      },
      { stripeAccount: stripeAccountId },
    )

    if (!session.url) throw new Error('Stripe returned no URL for this session.')

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const e = err as Record<string, unknown>
    console.error('[stripe/pay]', {
      type:       e?.type,
      code:       e?.code,
      param:      e?.param,
      statusCode: e?.statusCode,
      message:    e?.message,
    })
    return NextResponse.json(
      { error: (e?.message as string) ?? 'Unknown error', code: (e?.code as string) ?? null },
      { status: 500 },
    )
  }
}
