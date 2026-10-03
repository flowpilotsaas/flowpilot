import { notFound } from 'next/navigation'
import { createServiceSupabase } from '@/lib/supabase-service'
import EstimatePortalClient from './EstimatePortalClient'

export default async function EstimatePortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
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
    .select('id, estimate_number, customer_name, status, subtotal, markup_percent, tax_percent, discount, total, notes, created_at, organization_id, payment_link_url')
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

  return (
    <EstimatePortalClient
      estimate={estimate}
      lineItems={liRes.data ?? []}
      businessName={orgRes.data?.name ?? null}
      token={token}
      existingPaymentUrl={estimate.payment_link_url ?? null}
    />
  )
}
