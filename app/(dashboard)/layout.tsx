'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { useTrialStatus } from '@/hooks/useTrialStatus'

function TrialBanner() {
  const { isLoading, hasActiveSub, trialDaysLeft, isAllowed } = useTrialStatus()

  if (isLoading || hasActiveSub) return null

  if (!isAllowed) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-center text-sm text-destructive">
        Your free trial has ended.{' '}
        <Link href="/dashboard/billing" className="font-semibold underline">
          Subscribe to continue →
        </Link>
      </div>
    )
  }

  if (trialDaysLeft <= 7) {
    return (
      <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-400">
        Your free trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}.{' '}
        <Link href="/dashboard/billing" className="font-semibold underline">
          Subscribe now →
        </Link>
      </div>
    )
  }

  return null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setChecked(true)
      }
    })
  }, [router])

  if (!checked) return null

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <TrialBanner />
      <DashboardHeader />
      <div className="flex flex-1 min-h-0">
        <DashboardSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
