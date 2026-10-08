import { createServiceSupabase } from '@/lib/supabase-service'
import { stripe } from '@/lib/stripe'

export async function recordEstimatePayment({
  sessionId,
  stripeAccountId,
}: {
  sessionId: string
  stripeAccountId: string
}): Promise<{ ok: boolean; alreadyRecorded: boolean }> {
  const supabase = createServiceSupabase()

  // ── 1. Retrieve the Checkout Session from the connected account ────────────
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    {},
    { stripeAccount: stripeAccountId },
  )

  // ── 2. Payment must be complete ────────────────────────────────────────────
  if (session.payment_status !== 'paid') {
    return { ok: false, alreadyRecorded: false }
  }

  // ── 3. Resolve estimate from session metadata ──────────────────────────────
  const estimateId = session.metadata?.estimate_id
  if (!estimateId) {
    throw new Error('[record-estimate-payment] Session has no estimate_id in metadata')
  }

  const { data: estimate } = await supabase
    .from('estimates')
    .select('id, total, organization_id, customer_id, customer_name')
    .eq('id', estimateId)
    .maybeSingle()

  if (!estimate) throw new Error('[record-estimate-payment] Estimate not found')

  // ── 4. Load org (for owner_id) + stripe account row ───────────────────────
  const [orgRes, stripeRowRes] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, owner_id')
      .eq('id', estimate.organization_id)
      .maybeSingle(),
    supabase
      .from('organization_stripe_accounts')
      .select('stripe_account_id')
      .eq('organization_id', estimate.organization_id)
      .maybeSingle(),
  ])

  if (!orgRes.data) throw new Error('[record-estimate-payment] Organization not found')
  if (!stripeRowRes.data) throw new Error('[record-estimate-payment] No Stripe account row found')

  // ── 5. Verify the caller's account ID matches what is saved in the DB ──────
  if (stripeRowRes.data.stripe_account_id !== stripeAccountId) {
    throw new Error('[record-estimate-payment] stripe_account_id mismatch — refusing to record')
  }

  // ── 6. Verify amount and currency ──────────────────────────────────────────
  const expectedCents = Math.round(estimate.total * 100)
  if (session.amount_total !== expectedCents) {
    throw new Error(
      `[record-estimate-payment] Amount mismatch: expected ${expectedCents} cents, got ${session.amount_total}`,
    )
  }
  if ((session.currency?.toLowerCase() ?? '') !== 'usd') {
    throw new Error(
      `[record-estimate-payment] Currency mismatch: expected usd, got ${session.currency}`,
    )
  }

  // ── 7. Idempotency: bail early if already recorded ─────────────────────────
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()

  if (existing) return { ok: true, alreadyRecorded: true }

  // ── 8. Find a job linked to this estimate ──────────────────────────────────
  const { data: job } = await supabase
    .from('jobs')
    .select('id, job_number, created_at')
    .eq('estimate_id', estimate.id)
    .maybeSingle()

  // Format job number text the same way the jobs page does (JOB-YYYY-NNNNNN)
  const jobNumberText =
    job?.job_number != null && job.created_at
      ? `JOB-${new Date(job.created_at).getFullYear()}-${String(job.job_number).padStart(6, '0')}`
      : null

  // ── 9. Insert transaction ──────────────────────────────────────────────────
  await supabase.from('transactions').insert({
    user_id:                    orgRes.data.owner_id,
    organization_id:            estimate.organization_id,
    job_id:                     job?.id ?? null,
    job_number:                 jobNumberText,
    customer_id:                estimate.customer_id ?? null,
    customer_name:              estimate.customer_name ?? null,
    amount:                     estimate.total,
    payment_method:             'Stripe',
    status:                     'paid',
    type:                       'payment',
    date:                       new Date().toISOString().slice(0, 10),
    estimate_id:                estimate.id,
    stripe_checkout_session_id: sessionId,
  })

  // ── 10. Mark estimate as paid ──────────────────────────────────────────────
  await supabase
    .from('estimates')
    .update({ payment_link_status: 'paid', status: 'Approved' })
    .eq('id', estimate.id)

  // ── 11. Update linked job (only if status IS DISTINCT FROM 'Paid') ─────────
  if (job) {
    await supabase
      .from('jobs')
      .update({ status: 'Paid' })
      .eq('id', job.id)
      .or('status.neq.Paid,status.is.null')
  }

  return { ok: true, alreadyRecorded: false }
}
