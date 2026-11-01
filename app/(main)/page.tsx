import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calendar, Users, CreditCard, MessageSquare,
  MapPin, FileText, CheckCircle2, ArrowRight, ChevronDown,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Jobigram — Field Service Management for Contractors',
  description:
    'Scheduling, estimates, dispatch, and online payments for HVAC, plumbing, and electrical contractors. Start your 30-day free trial — no credit card required.',
  openGraph: {
    title: 'Jobigram — Field Service Management for Contractors',
    description:
      'Scheduling, estimates, dispatch, and online payments for HVAC, plumbing, and electrical contractors.',
    type: 'website',
  },
}

// ── Content ────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Add a customer and job',
    body: 'Create a customer profile, log the service address, and schedule the job. Your whole crew sees the calendar update in real time.',
  },
  {
    n: '02',
    title: 'Send an estimate they approve online',
    body: 'Build a line-item estimate and send a secure link. Customers review, approve, and sign off from any device — no phone tag.',
  },
  {
    n: '03',
    title: 'Get paid',
    body: 'Once approved, customers pay by card directly from the estimate link. Funds go straight to your Stripe account.',
  },
]

const FEATURES = [
  {
    Icon: Calendar,
    title: 'Job Scheduling',
    body: 'Drag-and-drop calendar for assigning jobs and technicians. No more double-bookings or missed appointments.',
  },
  {
    Icon: FileText,
    title: 'Estimates & Approval',
    body: 'Build estimates from your pricebook, send a link, get a signed approval — without picking up the phone.',
  },
  {
    Icon: CreditCard,
    title: 'Online Payments',
    body: 'Customers pay by card from the estimate link. Stripe deposits the money straight to your bank account.',
  },
  {
    Icon: MessageSquare,
    title: 'Email & SMS Reminders',
    body: 'Automated reminders keep customers informed before every appointment so jobs stay on track.',
  },
  {
    Icon: MapPin,
    title: 'Dispatch & Teams',
    body: 'Assign jobs to technicians, track job status in real time, and view your whole crew\'s day at a glance.',
  },
  {
    Icon: Users,
    title: 'Customer Portal',
    body: 'Every estimate gets a secure customer-facing link. Customers approve and pay without creating an account.',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: 29 as number | null,
    description: 'For small field service teams',
    features: [
      'Up to 5 team members',
      'Job scheduling & calendar',
      'Customer database',
      'Estimates with online approval',
      'Email reminders',
      'Basic reporting',
    ],
    cta: 'Start free trial',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 59 as number | null,
    description: 'For growing field service businesses',
    features: [
      'Everything in Starter',
      'Unlimited team members',
      'Dispatch & team management',
      'Online payments via Stripe',
      'SMS reminders & calling',
      'Pricebook & service agreements',
      'Priority support',
    ],
    cta: 'Start free trial',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: null as number | null,
    description: 'For larger operations',
    features: [
      'Everything in Pro',
      'Dedicated onboarding',
      'Custom integrations',
      'Advanced reporting',
    ],
    cta: 'Contact us',
    href: '/contact',
    highlight: false,
  },
]

const FAQS = [
  {
    q: 'How long is the free trial?',
    a: '30 days — no credit card required. Every feature is available during the trial so you can see exactly what you\'re signing up for.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Cancel at any time from your billing settings. No contracts, no cancellation fees, no hassle.',
  },
  {
    q: 'How does online payment work?',
    a: 'You connect your own Stripe account in Settings. Customers see a Pay Now button on the estimate link and pay by card. The money goes straight to your Stripe balance — Jobigram never holds your funds.',
  },
  {
    q: 'Does Jobigram work on mobile?',
    a: 'Yes. The dashboard is fully responsive and works in any modern mobile browser. No separate app download needed.',
  },
  {
    q: 'Do I need Stripe to use Jobigram?',
    a: 'No. Scheduling, dispatch, customers, and estimates all work without Stripe. You only need it if you want to accept online card payments.',
  },
  {
    q: 'How do I get help?',
    a: 'Email support is included on every plan. We aim to respond within one business day.',
  },
]

// ── Shared link styles ─────────────────────────────────────────────────

const primaryLink =
  'inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// ── Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-36 sm:pb-28 sm:pt-44">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

            {/* Copy */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.125rem] lg:leading-[1.15]">
                Run your field service business without the paperwork.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Jobigram handles scheduling, estimates, dispatch, and online payments — so you can focus on the work, not the admin.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className={primaryLink}>
                  Start free trial <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-5 text-xs text-muted-foreground/60">
                30-day free trial · No credit card required · Payments powered by Stripe
              </p>
            </div>

            {/* Product visual — three overlapping UI cards with fictional data */}
            <div className="relative mx-auto w-full max-w-sm lg:max-w-none" aria-hidden="true">

              {/* Card 1: Scheduled job */}
              <div className="relative z-10 w-56 rounded-xl border border-border bg-card p-4 shadow-md">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Today · 9:30 AM
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">HVAC Tune-Up</p>
                <p className="mt-0.5 text-xs text-muted-foreground">143 Oak Street · Sarah M.</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    Assigned
                  </span>
                  <span className="text-xs text-muted-foreground">Mike R.</span>
                </div>
              </div>

              {/* Card 2: Approved estimate */}
              <div className="relative z-20 -mt-4 ml-16 w-56 rounded-xl border border-border bg-card p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground">EST-0042</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Sent
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">Water Heater Install</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">$1,240</p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  Customer approved
                </div>
              </div>

              {/* Card 3: Payment received */}
              <div className="relative z-10 -mt-4 ml-8 w-56 rounded-xl border border-border bg-card p-4 shadow-md">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Payment received</p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">$1,240.00</p>
                <p className="mt-1 text-xs text-muted-foreground">via Stripe · 2 min ago</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-muted/30 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              From new job to paid invoice in three steps.
            </p>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex flex-col gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-bold text-primary">{step.n}</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Built specifically for HVAC, plumbing, and electrical contractors.
            </p>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {FEATURES.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-sm"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="bg-muted/30 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              30-day free trial on every plan. No credit card required to start.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
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
                <div className="mb-6">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                  <div className="mt-4">
                    {plan.price !== null ? (
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold tabular-nums text-foreground">
                          ${plan.price}
                        </span>
                        <span className="mb-1.5 text-sm text-muted-foreground">/mo</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    )}
                  </div>
                </div>
                <ul className="mb-8 space-y-2.5" role="list">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-primary'
                      : 'border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-ring'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <dl className="divide-y divide-border">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                  <dt>{faq.q}</dt>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <dd className="mt-3 pr-8 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </dd>
              </details>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-primary/15 bg-primary/5 px-8 py-14 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to cut the paperwork?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Start your 30-day free trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={primaryLink}>
              Start free trial <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-lg px-6 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Talk to us →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
