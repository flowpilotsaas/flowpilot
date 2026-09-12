'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type OrgRole = 'owner' | 'admin' | 'technician'

export type Organization = {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export type OrgState = {
  organizationId: string | null
  role: OrgRole | null
  organization: Organization | null
  loading: boolean
}

export function useOrganization(): OrgState {
  const [state, setState] = useState<OrgState>({
    organizationId: null,
    role:           null,
    organization:   null,
    loading:        true,
  })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setState({ organizationId: null, role: null, organization: null, loading: false })
      return
    }

    const { data } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(id, name, owner_id, created_at)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (data) {
      setState({
        organizationId: data.organization_id,
        role:           data.role as OrgRole,
        organization:   data.organizations as unknown as Organization,
        loading:        false,
      })
    } else {
      // No org yet — attempt server-side provisioning (fallback for pre-trigger users)
      try {
        const res = await fetch('/api/auth/provision-org', { method: 'POST' })
        if (!res.ok) {
          const body = await res.text().catch(() => '(unreadable)')
          console.error('[useOrganization] provision-org returned', res.status, body)
        }
        if (res.ok) {
          // Re-query after provisioning
          const { data: retry } = await supabase
            .from('organization_members')
            .select('organization_id, role, organizations(id, name, owner_id, created_at)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle()

          if (retry) {
            setState({
              organizationId: retry.organization_id,
              role:           retry.role as OrgRole,
              organization:   retry.organizations as unknown as Organization,
              loading:        false,
            })
            return
          }
        }
      } catch {
        // Provision failed silently — user will see empty state
      }
      setState({ organizationId: null, role: null, organization: null, loading: false })
    }
  }, [])

  useEffect(() => {
    load()

    // Re-load when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })
    return () => subscription.unsubscribe()
  }, [load])

  return state
}
