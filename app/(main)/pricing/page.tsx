import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Pricing — Jobigram',
  description: `All plans include every feature. ${TRIAL_DAYS}-day free trial, no credit card required. Plans start at $49/month.`,
}

const ALL_FEATURES = [
  'Job scheduling & calendar',
  'Customer database',
  'Estimates with online approval',
  'Dispatch & team management',
  'Online payments via Stripe',
  'Email & SMS reminders',
  'Pricebook & service agreements',
  'Tasks & pipeline',
  'Equipment & inventory',
  'Reports',
  'Tech live map',
  'Communications (SMS & calling)',
]

const primaryLink =
  'inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export default function PricingPage() {
  return (
    <div className="px-6 pb-20 pt-36 sm:pt-44">
      <div className="mx-auto max-w-5xl">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {TRIAL_DAYS}-day free trial on every plan. No credit card required.
          </p>
          <p className="mt-2 text-base font-medium text-foreground">
            Every plan includes all features. Plans differ only by team size.
          </p>
        </div>

        {/* ── Plan cards ─────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlight
                  ? 'border-primary bg-card shadow-md shadow-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                    Most popular
                  </span>
                </div>
              )}
              <div className="mb-5">
                <h2 className="text-base font-bold text-foreground">{plan.name}</h2>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold tabular-nums text-foreground">
                    ${plan.price}
                  </span>
                  <span className="mb-1.5 text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {plan.cap >= 10_000
                    ? 'Unlimited team members'
                    : `Up to ${plan.cap} team members`}
                </p>
              </div>
              <Link
                href="/signup"
                className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary'
                    : 'border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-ring'
                }`}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </div>

        {/* ── All features included ───────────────────────────────── */}
        <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-foreground">
              Everything included on every plan
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No feature gating. Every tool is available from Kickstart through Enterprise.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2" role="list">
            {ALL_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* ── FAQ note + CTA ─────────────────────────────────────── */}
        <div className="mt-12 text-center">
          <p className="mb-6 text-sm text-muted-foreground">
            Have questions?{' '}
            <Link href="/contact" className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
              Contact us
            </Link>{' '}
            — we respond within one business day.
          </p>
          <Link href="/signup" className={primaryLink}>
            Start your {TRIAL_DAYS}-day free trial <ArrowRight className="size-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}
