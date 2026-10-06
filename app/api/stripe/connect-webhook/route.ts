import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceSupabase } from '@/lib/supabase-service'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  // ── 1. Config check ────────────────────────────────────────────────────
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[connect-webhook] FATAL: STRIPE_CONNECT_WEBHOOK_SECRET is not set')
    return Response.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  // ── 2. Read raw body (must not be parsed before signature verification) ─
  let body: string
  try {
    body = await req.text()
  } catch (err) {
    console.error('[connect-webhook] Failed to read request body:', err)
    return Response.json({ error: 'Could not read request body.' }, { status: 400 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }

  // ── 3. Verify signature ────────────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[connect-webhook] Signature verification failed:', (err as Error).message)
    return Response.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 })
  }

  const connectedAccountId = event.account
  console.log('[connect-webhook] event.type:', event.type, '| account:', connectedAccountId ?? 'none')

  // ── 4. Dispatch ────────────────────────────────────────────────────────
  try {
    const supabase = createServiceSupabase()

    switch (event.type) {

      // Sync charges_enabled / details_submitted after onboarding changes.
      case 'account.updated': {
        if (!connectedAccountId) {
          console.warn('[connect-webhook] account.updated: missing event.account, ignoring')
          break
        }
        const account = event.data.object as Stripe.Account

        const { error } = await supabase
          .from('organization_stripe_accounts')
          .update({
            charges_enabled:   account.charges_enabled   ?? false,
            details_submitted: account.details_submitted ?? false,
            updated_at:        new Date().toISOString(),
          })
          .eq('stripe_account_id', connectedAccountId)

        if (error) {
          console.error('[connect-webhook] account.updated DB error:', error.message)
        } else {
          console.log('[connect-webhook] account.updated synced:', connectedAccountId,
            '| charges_enabled:', account.charges_enabled,
            '| details_submitted:', account.details_submitted)
        }
        break
      }

      // Business disconnected from our platform in their Stripe Dashboard.
      case 'account.application.deauthorized': {
        if (!connectedAccountId) {
          console.warn('[connect-webhook] account.application.deauthorized: missing event.account, ignoring')
          break
        }

        const { error } = await supabase
          .from('organization_stripe_accounts')
          .update({
            stripe_account_id: null,
            charges_enabled:   false,
            details_submitted: false,
            updated_at:        new Date().toISOString(),
          })
          .eq('stripe_account_id', connectedAccountId)

        if (error) {
          console.error('[connect-webhook] deauthorized DB error:', error.message)
        } else {
          console.log('[connect-webhook] deauthorized: cleared org row for', connectedAccountId)
        }
        break
      }

      default:
        console.log('[connect-webhook] unhandled event type (ignored):', event.type)
        break
    }
  } catch (err) {
    const msg = (err as Error).message
    console.error('[connect-webhook] uncaught error:', msg)
    return Response.json({ error: 'Internal error processing webhook.' }, { status: 500 })
  }

  return Response.json({ received: true })
}
