'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function BillingPage() {
  const [currentPlan] = React.useState('Starter')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing &amp; Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your subscription and payment methods</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          To complete payment setup, connect a bank account or card in the Payment Methods section below.
        </p>
      </div>

      {/* Current plan */}
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
              <p className="text-sm font-semibold text-foreground">{currentPlan}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500 mt-1">
                Active
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm">Manage Plan</Button>
        </CardContent>
      </Card>

      {/* Plan selection */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Change Subscription Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'relative flex flex-col transition-shadow',
                plan.highlight && 'ring-2 ring-primary shadow-md'
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}
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
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full mt-2"
                  size="sm"
                >
                  Choose Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">No payment methods on file.</p>
          <Button variant="outline" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Connect Bank Account
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
                    <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-sm text-muted-foreground">No transactions yet.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
