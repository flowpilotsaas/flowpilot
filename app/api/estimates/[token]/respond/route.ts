import { NextRequest } from 'next/server'
import { createServiceSupabase } from '@/lib/supabase-service'
import { createEstimatePaymentSession } from '@/lib/stripe-estimate-session'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const body = await req.json().catch(() => null)
  if (!body || !['approve', 'decline'].includes(body.action)) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { action } = body as { action: 'approve' | 'decline' }

  const supabase = createServiceSupabase()

  const { data: estimate } = await supabase
    .from('estimates')
    .select('id, estimate_number, status, customer_email, customer_name, total')
    .eq('public_token', token)
    .maybeSingle()

  if (!estimate) {
    return Response.json({ error: 'Estimate not found.' }, { status: 404 })
  }

  if (estimate.status === 'Approved' || estimate.status === 'Declined') {
    return Response.json(
      { error: 'This estimate has already been decided.', status: estimate.status },
      { status: 409 },
    )
  }

  const newStatus = action === 'approve' ? 'Approved' : 'Declined'

  const { error: updateErr } = await supabase
    .from('estimates')
    .update({ status: newStatus })
    .eq('id', estimate.id)

  if (updateErr) {
    return Response.json({ error: updateErr.message }, { status: 500 })
  }

  const origin = req.nextUrl.origin

  // Trigger notifications — mirrors handleStatusChange in estimates/[id]/page.tsx
  // Approved/Declined: email only (matches existing internal behavior)
  if (estimate.customer_email) {
    const type = newStatus === 'Approved' ? 'estimate_approved' : 'estimate_declined'
    const data =
      newStatus === 'Approved'
        ? { customerName: estimate.customer_name, total: estimate.total }
        : { customerName: estimate.customer_name }

    await fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: estimate.customer_email, type, data }),
    }).catch((err) => {
      console.warn('[estimate-respond] notification failed:', err)
    })
  }

  // On approval, generate a Stripe payment link immediately so the customer can pay now.
  // Non-blocking: if Stripe fails the estimate is still approved.
  let paymentUrl: string | null = null
  if (newStatus === 'Approved') {
    try {
      paymentUrl = await createEstimatePaymentSession({
        estimate,
        successUrl: `${origin}/e/${token}?payment=success`,
        cancelUrl: `${origin}/e/${token}`,
      })
      await supabase
        .from('estimates')
        .update({ payment_link_url: paymentUrl, payment_link_status: 'sent' })
        .eq('id', estimate.id)
    } catch (err) {
      console.error('[estimate-respond] Stripe session failed (non-blocking):', err)
    }
  }

  return Response.json({ ok: true, status: newStatus, paymentUrl })
}
