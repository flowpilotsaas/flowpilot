import { SupabaseClient } from '@supabase/supabase-js'

const TRIAL_DAYS = 30

export type WriteAccessResult =
  | { allowed: true }
  | { allowed: false; code: 'trial_expired' | 'no_org'; message: string }

export async function checkWriteAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<WriteAccessResult> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(created_at, owner_id)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) {
    return { allowed: false, code: 'no_org', message: 'No organization found.' }
  }

  const orgsRaw = membership.organizations as unknown
  const org = Array.isArray(orgsRaw)
    ? (orgsRaw[0] as { created_at: string; owner_id: string } | undefined)
    : (orgsRaw as { created_at: string; owner_id: string } | null)

  if (!org) {
    return { allowed: false, code: 'no_org', message: 'No organization found.' }
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', org.owner_id)
    .maybeSingle()

  if (sub?.status === 'active' || sub?.status === 'trialing') {
    return { allowed: true }
  }

  const trialEnd = new Date(org.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  if (Date.now() <= trialEnd) {
    return { allowed: true }
  }

  return {
    allowed: false,
    code: 'trial_expired',
    message: 'Your free trial has ended. Subscribe to continue creating and editing.',
  }
}
