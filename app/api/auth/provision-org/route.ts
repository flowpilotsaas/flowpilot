import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// Called as a fallback for users who signed up before the DB trigger was added.
// The trigger handles all new signups automatically; this route handles existing users.
export async function POST(_req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Already in an org — nothing to do
  const { data: existing } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) return Response.json({ ok: true, alreadyExists: true })

  // Check if there's a pending invite for this email (someone invited them before they signed up)
  const { data: pending } = await supabase
    .from('organization_members')
    .select('id, organization_id')
    .eq('email', user.email!)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) {
    // Accept the invite — link auth user to the pending record
    const { error } = await supabase
      .from('organization_members')
      .update({ user_id: user.id, status: 'active' })
      .eq('id', pending.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, organizationId: pending.organization_id, fromInvite: true })
  }

  // No org, no invite — create a fresh organization
  const orgName = (user.email?.split('@')[0] ?? 'My') + "'s Organization"
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, owner_id: user.id })
    .select('id')
    .single()

  if (orgError) {
    console.error('[provision-org] org insert failed:', orgError.message)
    return Response.json({ error: orgError.message }, { status: 500 })
  }

  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id:         user.id,
      email:           user.email,
      role:            'owner',
      status:          'active',
    })

  if (memberError) {
    console.error('[provision-org] member insert failed:', memberError.message)
    return Response.json({ error: memberError.message }, { status: 500 })
  }

  return Response.json({ ok: true, organizationId: org.id })
}
