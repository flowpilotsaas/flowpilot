'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from './useOrganization'

const TRIAL_DAYS = 30

export type TrialStatus = {
  isLoading: boolean
  hasActiveSub: boolean
  trialDaysLeft: number  // negative means expired
  isAllowed: boolean     // active sub OR within trial window
}

export function useTrialStatus(): TrialStatus {
  const { organization, loading: orgLoading } = useOrganization()
  const [hasActiveSub, setHasActiveSub] = useState(false)
  const [subLoading, setSubLoading] = useState(true)

  useEffect(() => {
    if (orgLoading) return
    if (!organization) { setSubLoading(false); return }

    supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', organization.owner_id)
      .maybeSingle()
      .then(({ data }) => {
        setHasActiveSub(data?.status === 'active' || data?.status === 'trialing')
        setSubLoading(false)
      })
  }, [organization, orgLoading])

  const trialDaysLeft = organization
    ? Math.ceil(
        (new Date(organization.created_at).getTime() +
          TRIAL_DAYS * 24 * 60 * 60 * 1000 -
          Date.now()) /
          (24 * 60 * 60 * 1000)
      )
    : 0

  const isAllowed = hasActiveSub || trialDaysLeft > 0

  return {
    isLoading: orgLoading || subLoading,
    hasActiveSub,
    trialDaysLeft,
    isAllowed,
  }
}
