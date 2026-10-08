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

    // ── 2. Org + role (never from request body) ─────────────────────────────
    const { data: membership } = await supabaseAuth
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) return NextResponse.json({ error: 'No organization found.' }, { status: 403 })
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can connect Stripe.' }, { status: 403 })
    }

    const orgId    = membership.organization_id
    const supabase = createServiceSupabase()

    // ── 3. Claim a slot: insert a placeholder row (ON CONFLICT DO NOTHING) ──
    await supabase
      .from('organization_stripe_accounts')
      .upsert(
        {
          organization_id:   orgId,
          stripe_account_id: null,
          charges_enabled:   false,
          details_submitted: false,
          updated_at:        new Date().toISOString(),
        },
        { ignoreDuplicates: true },
      )

    // ── 4. Read the current row: another request may have already won ────────
    const { data: current } = await supabase
      .from('organization_stripe_accounts')
      .select('stripe_account_id')
      .eq('organization_id', orgId)
      .maybeSingle()

    let stripeAccountId = current?.stripe_account_id ?? null

    if (!stripeAccountId) {
      // ── 5. Fetch org name for display_name ────────────────────────────────
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()

      // ── 6. Create the Stripe account via v2 REST API ──────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (stripe.v2.core.accounts as any).create({
        contact_email: user.email ?? undefined,
        display_name:  org?.name ?? undefined,
        dashboard:     'full',
        identity:      { country: 'us' },
        defaults: {
          responsibilities: {
            fees_collector:   'stripe',
            losses_collector: 'stripe',
          },
        },
        configuration: {
          merchant: {
            capabilities: { card_payments: { requested: true } },
          },
        },
        include:  ['configuration.merchant'],
        metadata: { organization_id: orgId },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newId = (account as any).id as string

      // ── 6. Compare-and-set: only update if stripe_account_id is still null ─
      const { data: saved } = await supabase
        .from('organization_stripe_accounts')
        .update({
          stripe_account_id: newId,
          updated_at:        new Date().toISOString(),
        })
        .eq('organization_id', orgId)
        .is('stripe_account_id', null)
        .select('stripe_account_id')
        .maybeSingle()

      if (saved?.stripe_account_id) {
        stripeAccountId = saved.stripe_account_id
      } else {
        // Another request won — re-read the ID they saved.
        const { data: winner } = await supabase
          .from('organization_stripe_accounts')
          .select('stripe_account_id')
          .eq('organization_id', orgId)
          .maybeSingle()
        stripeAccountId = winner?.stripe_account_id ?? null
      }
    }

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Could not establish a Stripe account.' }, { status: 500 })
    }

    // ── 7. Create Account Link for the authoritative ID in the DB ────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accountLink = await (stripe.v2.core.accountLinks as any).create({
      account:  stripeAccountId,
      use_case: {
        type:                'account_onboarding',
        account_onboarding: {
          return_url:  `${baseUrl}/dashboard/settings?stripe=return`,
          refresh_url: `${baseUrl}/dashboard/settings?stripe=refresh`,
        },
      },
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: unknown) {
    const e = err as Record<string, unknown>
    console.error('[connect/onboard]', {
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
