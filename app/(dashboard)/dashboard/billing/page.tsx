'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Check, CheckCircle2, AlertCircle, Loader2, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

type SubscriptionRow = {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_name: string | null
  status: string | null
  current_period_end: string | null
  created_at: string
}

type Plan = {
  name: string
  price: number
  features: string[]
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Kickstart',
    price: 49,
    features: ['Up to 2 users', '50 jobs/month', 'Basic scheduling', 'Email support'],
  },
  {
    name: 'Standard',
    price: 99,
    features: ['Up to 5 users', '200 jobs/month', 'Scheduling + dispatch', 'Estimates', 'Phone support'],
  },
  {
    name: 'Business',
    price: 149,
    features: ['Up to 10 users', 'Unlimited jobs', 'Full scheduling suite', 'Inventory', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Professional',
    price: 199,
    features: ['Up to 20 users', 'Everything in Business', 'Pipeline & CRM', 'Custom reports', 'Dedicated support'],
  },
  {
    name: 'Growth',
    price: 299,
    features: ['Up to 50 users', 'Everything in Pro', 'GPS tracking', 'Multi-location', 'API access'],
  },
  {
    name: 'Enterprise',
    price: 499,
    features: ['Unlimited users', 'Everything in Growth', 'Custom integrations', 'SLA guarantee', 'White-glove onboarding'],
  },
]

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}


export default function BillingPage() {
  const [loadingData, setLoadingData]     = React.useState(true)
  const [sub, setSub]                     = React.useState<SubscriptionRow | null>(null)
  const [billingHistory, setBillingHistory] = React.useState<SubscriptionRow[]>([])
  const [checkoutPlan, setCheckoutPlan] = React.useState<string | null>(null)
  const [portalLoading, setPortalLoading] = React.useState(false)
  const [success, setSuccess]           = React.useState(false)
  const [apiError, setApiError]         = React.useState('')

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('success=true')) {
      setSuccess(true)
      window.history.replaceState({}, '', '/dashboard/billing')
    }

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const rows = (subData ?? []) as SubscriptionRow[]
      setSub(rows[0] ?? null)
      setBillingHistory(rows)
      setLoadingData(false)
    }
    load()
  }, [])

  const handleChoosePlan = async (planName: string) => {
    setApiError('')
    setCheckoutPlan(planName)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setApiError(data.error ?? 'Something went wrong. Please try again.')
        setCheckoutPlan(null)
      }
    } catch {
      setApiError('Network error. Please try again.')
      setCheckoutPlan(null)
    }
  }

  const handlePortal = async () => {
    setApiError('')
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setApiError(data.error ?? 'Could not open billing portal.')
        setPortalLoading(false)
      }
    } catch {
      setApiError('Network error. Please try again.')
      setPortalLoading(false)
    }
  }

  const statusLabel = sub?.status ?? null
  const statusBadgeClass =
    statusLabel === 'active' || statusLabel === 'trialing'
      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500'
      : statusLabel === 'past_due'
      ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-500'
      : statusLabel === 'cancelled' || statusLabel === 'canceled'
      ? 'bg-muted text-muted-foreground'
      : 'bg-muted text-muted-foreground'

  const statusDisplay =
    statusLabel === 'active'    ? 'Active' :
    statusLabel === 'trialing'  ? 'Trial' :
    statusLabel === 'past_due'  ? 'Past Due' :
    statusLabel === 'cancelled' || statusLabel === 'canceled' ? 'Cancelled' :
    statusLabel ?? 'Inactive'

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing &amp; Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your subscription and payment methods</p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Payment successful! Your subscription is now active.
          </p>
        </div>
      )}

      {/* Error banner */}
      {apiError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
        </div>
      )}

      {/* Setup info banner — only when no subscription */}
      {!loadingData && !sub && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Choose a plan below to get started. You&apos;ll be taken to a secure checkout page.
          </p>
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground">Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              {loadingData ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading…</span>
                </div>
              ) : sub ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    {sub.plan_name ?? 'Unknown Plan'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusBadgeClass)}>
                      {statusDisplay}
                    </span>
                    {sub.current_period_end && (
                      <span className="text-xs text-muted-foreground">
                        Renews {fmtDate(sub.current_period_end)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No active subscription</p>
              )}
            </div>
          </div>
          {sub && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={portalLoading}
              className="gap-1.5"
            >
              {portalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Manage Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan selection */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">
          {sub ? 'Change Subscription Plan' : 'Choose a Plan'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {PLANS.map((plan) => {
            const isCurrent = plan.name === sub?.plan_name
            const isLoading = checkoutPlan === plan.name
            return (
              <div key={plan.name} className="relative pt-5">
                {plan.highlight && !isCurrent && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white whitespace-nowrap">
                      <Check className="w-3 h-3" /> Current Plan
                    </span>
                  </div>
                )}
                <Card
                  className={cn(
                    'flex flex-col transition-shadow h-full',
                    plan.highlight && 'ring-2 ring-primary shadow-md',
                    isCurrent && 'ring-2 ring-green-500 shadow-md',
                  )}
                >
                <CardContent className="p-5 flex flex-col flex-1 gap-4">
                  <div>
                    <p className="text-base font-semibold text-foreground">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? 'outline' : plan.highlight ? 'default' : 'outline'}
                    className={cn('w-full mt-2 gap-1.5', isCurrent && 'text-green-700 border-green-300')}
                    size="sm"
                    disabled={isCurrent || isLoading || checkoutPlan !== null}
                    onClick={() => !isCurrent && handleChoosePlan(plan.name)}
                  >
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isCurrent ? 'Current Plan' : isLoading ? 'Redirecting…' : 'Choose Plan'}
                  </Button>
                </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {sub
              ? 'Manage your saved payment methods and bank accounts via the billing portal.'
              : 'No payment methods on file. Subscribe to a plan to add one.'}
          </p>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handlePortal}
            disabled={!sub || portalLoading}
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {sub ? 'Manage Payment Methods' : 'Connect Bank Account'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="py-0 overflow-hidden">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-base font-semibold text-foreground">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Date', 'Description', 'Status', 'Amount'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
                        <span className="text-sm text-muted-foreground">Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : billingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <DollarSign className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No billing transactions yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  billingHistory.map((row) => {
                    const planPrice = PLANS.find((p) => p.name === row.plan_name)?.price ?? 0
                    const s = row.status ?? ''
                    const badgeClass =
                      s === 'active' || s === 'trialing'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : s === 'past_due'
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                    const statusDisplay =
                      s === 'active'    ? 'Active' :
                      s === 'trialing'  ? 'Trial' :
                      s === 'past_due'  ? 'Past Due' :
                      s === 'cancelled' || s === 'canceled' ? 'Cancelled' :
                      s || '—'
                    return (
                      <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                          {fmtDate(row.created_at)}
                        </td>
                        <td className="px-6 py-3 text-foreground whitespace-nowrap">
                          {row.plan_name ? `${row.plan_name} Plan` : '—'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badgeClass)}>
                            {statusDisplay}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium text-foreground tabular-nums whitespace-nowrap">
                          {planPrice ? fmtCurrency(planPrice) : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
