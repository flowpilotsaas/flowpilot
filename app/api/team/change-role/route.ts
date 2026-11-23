import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const ASSIGNABLE_ROLES = ['admin', 'technician'] as const
type AssignableRole = typeof ASSIGNABLE_ROLES[number]

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId, role } = await req.json().catch(() => ({}))
  if (!memberId || !role) return Response.json({ error: 'Missing memberId or role.' }, { status: 400 })
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
    return Response.json({ error: `Invalid role. Allowed: ${ASSIGNABLE_ROLES.join(', ')}.` }, { status: 400 })
  }

  // Verify requester is an owner
  const { data: requesterMembership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!requesterMembership) {
    return Response.json({ error: 'You are not a member of any organization.' }, { status: 403 })
  }
  if (requesterMembership.role !== 'owner') {
    return Response.json({ error: 'Only the organization owner can change roles.' }, { status: 403 })
  }

  const orgId = requesterMembership.organization_id

  // Fetch the target member (must belong to same org)
  const { data: target } = await supabase
    .from('organization_members')
    .select('id, role, user_id, organization_id')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!target) {
    return Response.json({ error: 'Member not found in your organization.' }, { status: 404 })
  }
  if (target.role === 'owner') {
    return Response.json({ error: 'The owner role cannot be changed.' }, { status: 403 })
  }
  if (target.user_id === user.id) {
    return Response.json({ error: 'You cannot change your own role.' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)
    .eq('organization_id', orgId)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
