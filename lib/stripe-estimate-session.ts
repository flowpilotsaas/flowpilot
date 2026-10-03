import { stripe } from '@/lib/stripe'

type SessionEstimate = {
  id: string
  estimate_number: number
  customer_name: string | null
  customer_email: string | null
  total: number
}

// Shared Stripe Checkout session creation for estimates.
// Used by both the internal dashboard endpoint and the public portal respond route.
// Returns the checkout URL, or throws on error.
export async function createEstimatePaymentSession({
  estimate,
  successUrl,
  cancelUrl,
  userId,
}: {
  estimate: SessionEstimate
  successUrl: string
  cancelUrl: string
  userId?: string
}): Promise<string> {
  const amountCents = Math.round(estimate.total * 100)
  if (amountCents < 50) {
    throw new Error('Estimate total is too small to process a payment.')
  }

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
            ...(estimate.customer_name && {
              description: `Payment for ${estimate.customer_name}`,
            }),
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: 'estimate_payment',
      estimate_id: estimate.id,
      ...(userId ? { user_id: userId } : {}),
      customer_name: estimate.customer_name ?? '',
      customer_email: estimate.customer_email ?? '',
    },
  })

  if (!session.url) throw new Error('Stripe returned no URL for this session.')
  return session.url
}
