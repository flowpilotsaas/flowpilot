import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createServiceSupabase } from '@/lib/supabase-service'
import { stripe } from '@/lib/stripe'

export async function POST(_req: NextRequest) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const supabaseAuth = await createServerSupabase()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    // ── 2. Org + role ───────────────────────────────────────────────────────
    const { data: membership } = await supabaseAuth
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) return NextResponse.json({ error: 'No organization found.' }, { status: 403 })
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can check Stripe status.' }, { status: 403 })
    }

    const supabase = createServiceSupabase()

    // ── 3. Look up the connected account ───────────────────────────────────
    const { data: row } = await supabase
      .from('organization_stripe_accounts')
      .select('stripe_account_id')
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    if (!row?.stripe_account_id) {
      return NextResponse.json({ charges_enabled: false, details_submitted: false })
    }

    // ── 4. Retrieve fresh status from Stripe v2 API and sync to DB ───────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const account = await (stripe.v2.core.accounts as any).retrieve(
      row.stripe_account_id,
      { include: ['configuration.merchant'] },
    ) as any

    // v2 surfaces capability status instead of top-level boolean fields
    const cardPayments  = account?.configuration?.merchant?.capabilities?.card_payments
    const charges_enabled   = cardPayments?.status === 'active'
    // details_submitted = no blocking requirements (status_details empty)
    const details_submitted = (cardPayments?.status_details ?? []).length === 0

    await supabase
      .from('organization_stripe_accounts')
      .update({
        charges_enabled,
        details_submitted,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', membership.organization_id)

    return NextResponse.json({ charges_enabled, details_submitted })
  } catch (err: unknown) {
    const e = err as Record<string, unknown>
    console.error('[connect/status]', {
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
