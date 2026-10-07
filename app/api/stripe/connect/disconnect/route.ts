import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createServiceSupabase } from '@/lib/supabase-service'

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
      return NextResponse.json({ error: 'Only owners and admins can disconnect Stripe.' }, { status: 403 })
    }

    const supabase = createServiceSupabase()

    // ── 3. Clear the account link (service role bypasses RLS) ───────────────
    await supabase
      .from('organization_stripe_accounts')
      .update({
        stripe_account_id: null,
        charges_enabled:   false,
        details_submitted: false,
        updated_at:        new Date().toISOString(),
      })
      .eq('organization_id', membership.organization_id)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const e = err as Record<string, unknown>
    console.error('[connect/disconnect]', {
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
