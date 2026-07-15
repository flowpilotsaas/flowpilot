import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  console.log('[webhook] Supabase URL present:', !!url)
  console.log('[webhook] Supabase anon key present:', !!key)
  return createClient(url!, key!)
}

export async function POST(req: NextRequest) {
  console.log('[webhook] ── incoming POST ──────────────────────────────')
  console.log('[webhook] Content-Type:', req.headers.get('content-type'))
  console.log('[webhook] stripe-signature present:', !!req.headers.get('stripe-signature'))

  // ── 1. Env var check ──────────────────────────────────────────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  console.log('[webhook] STRIPE_WEBHOOK_SECRET present:', !!webhookSecret)
  console.log('[webhook] STRIPE_SECRET_KEY present:', !!process.env.STRIPE_SECRET_KEY)
  console.log('[webhook] NEXT_PUBLIC_SUPABASE_URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[webhook] NEXT_PUBLIC_SUPABASE_ANON_KEY present:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!webhookSecret) {
    console.error('[webhook] FATAL: STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local then restart the dev server.')
    return Response.json({ error: 'Webhook not configured.' }, { status: 500 })
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[webhook] FATAL: Supabase env vars are missing.')
    return Response.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  // ── 2. Read raw body (must be text, not json, for signature verification) ─
  let body: string
  try {
    body = await req.text()
    console.log('[webhook] Raw body length:', body.length, 'bytes')
    console.log('[webhook] Body preview (first 120 chars):', body.slice(0, 120))
  } catch (err) {
    console.error('[webhook] Failed to read request body:', err)
    return Response.json({ error: 'Could not read request body.' }, { status: 400 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    console.error('[webhook] Missing stripe-signature header.')
    return Response.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }
  console.log('[webhook] stripe-signature (first 60 chars):', sig.slice(0, 60))

  // ── 3. Verify Stripe signature ────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    console.log('[webhook] Signature verified OK. Event type:', event.type, '| ID:', event.id)
  } catch (err) {
    console.error('[webhook] Signature verification FAILED:', (err as Error).message)
    console.error('[webhook] This usually means STRIPE_WEBHOOK_SECRET does not match the one shown by `stripe listen`.')
    return Response.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 })
  }

  // ── 4. Process event ──────────────────────────────────────────────────
  try {
    const supabase = getSupabase()

    switch (event.type) {
      // ── checkout.session.completed ───────────────────────────────────
      case 'checkout.session.completed': {
        console.log('[webhook] Handling checkout.session.completed')
        const session = event.data.object as Stripe.Checkout.Session
        console.log('[webhook] session.mode:', session.mode)
        console.log('[webhook] session.customer:', session.customer)
        console.log('[webhook] session.subscription:', session.subscription)
        console.log('[webhook] session.metadata:', JSON.stringify(session.metadata))

        // ── estimate payment ─────────────────────────────────────────────
        if (session.mode === 'payment' && session.metadata?.type === 'estimate_payment') {
          const estimateId = session.metadata.estimate_id
          const userId = session.metadata.user_id
          console.log('[webhook] Estimate payment completed. estimateId:', estimateId, 'userId:', userId)

          if (estimateId && userId) {
            const { error: dbError } = await supabase
              .from('estimates')
              .update({ payment_link_status: 'paid', status: 'Approved' })
              .eq('id', estimateId)
              .eq('user_id', userId)
            if (dbError) {
              console.error('[webhook] Failed to update estimate:', dbError.message)
            } else {
              console.log('[webhook] Estimate updated to paid/Approved.')
            }
          }
          break
        }

        if (session.mode !== 'subscription' || !session.subscription) {
          console.log('[webhook] Skipping — not a subscription checkout.')
          break
        }

        const userId = session.metadata?.user_id
        const planName = session.metadata?.plan_name
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : (session.customer as Stripe.Customer)?.id ?? null
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription).id

        console.log('[webhook] userId:', userId)
        console.log('[webhook] planName:', planName)
        console.log('[webhook] customerId:', customerId)
        console.log('[webhook] subscriptionId:', subscriptionId)

        if (!userId || !customerId || !subscriptionId) {
          console.error('[webhook] MISSING required IDs — userId:', userId, 'customerId:', customerId, 'subscriptionId:', subscriptionId)
          break
        }

        console.log('[webhook] Fetching subscription from Stripe:', subscriptionId)
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        console.log('[webhook] Subscription status:', subscription.status)
        console.log('[webhook] Subscription keys:', Object.keys(subscription).join(', '))

        const periodEnd = (subscription as any).current_period_end as number | undefined
        console.log('[webhook] current_period_end (raw):', periodEnd)

        const upsertPayload = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan_name: planName ?? null,
          status: subscription.status,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        }
        console.log('[webhook] Upserting to subscriptions table:', JSON.stringify(upsertPayload))

        const { data: upsertData, error: dbError } = await supabase
          .from('subscriptions')
          .upsert(upsertPayload, { onConflict: 'user_id' })
          .select()
        if (dbError) {
          console.error('[webhook] DB upsert ERROR:', dbError.message, '| code:', dbError.code, '| details:', dbError.details)
        } else {
          console.log('[webhook] DB upsert SUCCESS. Rows affected:', upsertData?.length ?? 0)
        }
        break
      }

      // ── customer.subscription.created / updated ───────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log('[webhook] Handling', event.type)
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as Stripe.Customer).id

        console.log('[webhook] customerId:', customerId)
        console.log('[webhook] subscription.status:', subscription.status)

        const periodEnd = (subscription as any).current_period_end as number | undefined
        console.log('[webhook] current_period_end (raw):', periodEnd)

        const updatePayload = {
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        }
        console.log('[webhook] Updating subscriptions table where stripe_customer_id =', customerId)

        const { data: updateData, error: dbError } = await supabase
          .from('subscriptions')
          .update(updatePayload)
          .eq('stripe_customer_id', customerId)
          .select()
        if (dbError) {
          console.error('[webhook] DB update ERROR:', dbError.message, '| code:', dbError.code, '| details:', dbError.details)
        } else {
          console.log('[webhook] DB update SUCCESS. Rows affected:', updateData?.length ?? 0)
        }
        break
      }

      // ── customer.subscription.deleted ────────────────────────────────
      case 'customer.subscription.deleted': {
        console.log('[webhook] Handling customer.subscription.deleted')
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as Stripe.Customer).id

        console.log('[webhook] customerId:', customerId)

        const { data: updateData, error: dbError } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_customer_id', customerId)
          .select()
        if (dbError) {
          console.error('[webhook] DB update ERROR:', dbError.message, '| code:', dbError.code)
        } else {
          console.log('[webhook] DB update SUCCESS. Rows affected:', updateData?.length ?? 0)
        }
        break
      }

      default:
        console.log('[webhook] Unhandled event type (ignored):', event.type)
        break
    }
  } catch (err) {
    const error = err as Error
    console.error('[webhook] ══ UNCAUGHT ERROR ══════════════════════════════')
    console.error('[webhook] Event type:', event.type)
    console.error('[webhook] Error name:', error.name)
    console.error('[webhook] Error message:', error.message)
    console.error('[webhook] Stack trace:', error.stack)
    return Response.json({ error: 'Internal error processing webhook.' }, { status: 500 })
  }

  console.log('[webhook] ── done, returning 200 ──────────────────────────')
  return Response.json({ received: true })
}
