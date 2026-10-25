'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { useTrialStatus } from '@/hooks/useTrialStatus'
import { Toaster } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { ThemeProvider } from '@/components/ThemeProvider'

function ToastSuccessIcon() { return <CheckCircle2 className="w-4 h-4 text-success" /> }
function ToastErrorIcon()   { return <XCircle className="w-4 h-4 text-destructive" /> }
function ToastWarningIcon() { return <AlertTriangle className="w-4 h-4 text-warning" /> }
function ToastInfoIcon()    { return <Info className="w-4 h-4 text-primary" /> }

function TopBanner() {
  const { isLoading: trialLoading, hasActiveSub, trialDaysLeft, isAllowed } = useTrialStatus()

  const [role, setRole]                       = useState<string | null>(null)
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null)
  const [dismissed, setDismissed]             = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('stripe-nudge-dismissed') === '1') setDismissed(true)
    } catch {}
  }, [])

  useEffect(() => {
    async function checkStripe() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: mem } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      if (!mem || (mem.role !== 'owner' && mem.role !== 'admin')) return
      setRole(mem.role)
      const { data: sa } = await supabase
        .from('organization_stripe_accounts')
        .select('charges_enabled')
        .eq('organization_id', mem.organization_id)
        .maybeSingle()
      setStripeConnected(sa?.charges_enabled === true)
    }
    checkStripe()
  }, [])

  const dismissNudge = () => {
    setDismissed(true)
    try { localStorage.setItem('stripe-nudge-dismissed', '1') } catch {}
  }

  // Trial banner always takes priority
  if (!trialLoading && !hasActiveSub) {
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
  }

  // Stripe nudge — only when trial banner is not showing, user is owner/admin, not dismissed
  if (!trialLoading && role !== null && stripeConnected === false && !dismissed) {
    return (
      <div className="w-full border-b border-primary/15 bg-primary/5 px-4 py-2 flex items-center justify-between gap-2 text-sm">
        <span className="text-foreground/80">
          Connect Stripe to let customers pay estimates online.{' '}
          <Link href="/dashboard/settings" className="font-semibold text-primary hover:underline">
            Set up payments →
          </Link>
        </span>
        <button
          type="button"
          onClick={dismissNudge}
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      // Check if onboarding is complete before showing the dashboard
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (membership?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('onboarding_completed_at')
          .eq('id', membership.organization_id)
          .maybeSingle()

        // Only redirect if the column exists and is explicitly null
        if (org && org.onboarding_completed_at === null) {
          router.replace('/onboarding')
          return
        }
      }

      setChecked(true)
    })
  }, [router])

  if (!checked) return null

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <TopBanner />
        <DashboardHeader />
        <div className="flex flex-1 min-h-0">
          <DashboardSidebar />
          <main className="flex-1 min-w-0 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster
          position="top-right"
          offset={{ top: 8, right: 104 }}
          visibleToasts={1}
          closeButton
          duration={4000}
          toastOptions={{
            classNames: {
              toast: 'toast-card',
              title: 'toast-title',
              description: 'toast-description',
            },
          }}
          icons={{
            success: <ToastSuccessIcon />,
            error: <ToastErrorIcon />,
            warning: <ToastWarningIcon />,
            info: <ToastInfoIcon />,
          }}
        />
      </div>
    </ThemeProvider>
  )
}
