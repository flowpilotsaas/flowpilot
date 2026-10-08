import { notFound } from 'next/navigation'
import { createServiceSupabase } from '@/lib/supabase-service'
import { recordEstimatePayment } from '@/lib/record-estimate-payment'
import EstimatePortalClient from './EstimatePortalClient'

export default async function EstimatePortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { token } = await params
  const sp        = await searchParams

  console.log('[portal] 1 — token:', token)
  console.log('[portal] 2 — SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  let supabase
  try {
    supabase = createServiceSupabase()
    console.log('[portal] 3 — supabase client created ok')
  } catch (e) {
    console.error('[portal] 3 — createServiceSupabase() THREW:', String(e))
    notFound()
  }

  console.log('[portal] 4 — running estimates query for public_token:', token)
  const { data: estimate, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, customer_name, status, subtotal, markup_percent, tax_percent, discount, total, notes, created_at, organization_id, payment_link_status')
    .eq('public_token', token)
    .maybeSingle()

  console.log('[portal] 5 — query done. error:', JSON.stringify(error), '| id:', estimate?.id ?? null)

  if (error || !estimate) {
    console.error('[portal] 6 — notFound(). error.message:', error?.message, '| error.code:', (error as { code?: string } | null)?.code, '| data was null:', estimate === null)
    notFound()
  }

  const [liRes, orgRes] = await Promise.all([
    supabase
      .from('estimate_line_items')
      .select('id, name, description, quantity, unit_price, total')
      .eq('estimate_id', estimate.id)
      .order('id'),
    supabase
      .from('organizations')
      .select('name')
      .eq('id', estimate.organization_id)
      .maybeSingle(),
  ])

  // ── Payment confirmation on return from Stripe ──────────────────────────
  // payment_link_status is the DB's authoritative source; ?paid=1 triggers
  // server-side verification via Stripe before we trust it.
  let isPaid = estimate.payment_link_status === 'paid'

  if (!isPaid && sp.paid === '1' && typeof sp.session_id === 'string') {
    const sessionId = sp.session_id

    const { data: stripeRow } = await supabase
      .from('organization_stripe_accounts')
      .select('stripe_account_id')
      .eq('organization_id', estimate.organization_id)
      .maybeSingle()

    if (stripeRow?.stripe_account_id) {
      try {
        const result = await recordEstimatePayment({
          sessionId,
          stripeAccountId: stripeRow.stripe_account_id,
        })
        if (result.ok) isPaid = true
      } catch (err) {
        console.error('[portal] recordEstimatePayment failed:', err)
      }
    }
  }

  return (
    <EstimatePortalClient
      estimate={estimate}
      lineItems={liRes.data ?? []}
      businessName={orgRes.data?.name ?? null}
      token={token}
      isPaid={isPaid}
    />
  )
}
