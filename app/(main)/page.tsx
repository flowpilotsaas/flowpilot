import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calendar, Users, CreditCard, MessageSquare,
  MapPin, FileText, ArrowRight, ChevronDown,
} from 'lucide-react'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'
import { ONLINE_PAYMENTS_LIVE } from '@/lib/site-config'
import HeroDemo from '@/components/marketing/HeroDemo'

export const metadata: Metadata = {
  title: 'Jobigram — Field Service Management for Contractors',
  description:
    'Scheduling, estimates, and dispatch for HVAC, plumbing, and electrical contractors. Start your 30-day free trial — no credit card required.',
  openGraph: {
    title: 'Jobigram — Field Service Management for Contractors',
    description:
      'Scheduling, estimates, and dispatch for HVAC, plumbing, and electrical contractors.',
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
    title: 'Schedule the work and send reminders',
    body: 'Assign the job to a technician, set an appointment time, and let automated email and SMS reminders handle the follow-up.',
  },
]

const FEATURES = [
  {
    Icon: Calendar,
    title: 'Job Scheduling',
    body: 'Drag-and-drop calendar for assigning jobs and technicians. No more double-bookings or missed appointments.',
    comingSoon: false,
  },
  {
    Icon: FileText,
    title: 'Estimates & Approval',
    body: 'Build estimates from your pricebook, send a link, get a signed approval — without picking up the phone.',
    comingSoon: false,
  },
  {
    Icon: CreditCard,
    title: 'Online Payments',
    body: ONLINE_PAYMENTS_LIVE
      ? 'Customers pay by card from the estimate link. Stripe deposits the money straight to your bank account.'
      : 'Accept card payments directly from estimate links — Stripe-powered, funds go straight to your account.',
    comingSoon: !ONLINE_PAYMENTS_LIVE,
  },
  {
    Icon: MessageSquare,
    title: 'Email & SMS Reminders',
    body: 'Automated reminders keep customers informed before every appointment so jobs stay on track.',
    comingSoon: false,
  },
  {
    Icon: MapPin,
    title: 'Dispatch & Teams',
    body: "Assign jobs to technicians, track job status in real time, and view your whole crew's day at a glance.",
    comingSoon: false,
  },
  {
    Icon: Users,
    title: 'Customer Portal',
    body: 'Every estimate gets a secure customer-facing link. Customers approve without creating an account.',
    comingSoon: false,
  },
]

const FAQS = [
  {
    q: 'How long is the free trial?',
    a: `${TRIAL_DAYS} days — no credit card required. Every feature is available during the trial so you can see exactly what you're signing up for.`,
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Cancel at any time from your billing settings. No contracts, no cancellation fees, no hassle.',
  },
  {
    q: 'How does the estimate approval work?',
    a: 'When you send an estimate, the customer gets an email with a secure link. They can open it on any device, review the line items, and tap Approve or Decline — no account required.',
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

// ── Shared styles ──────────────────────────────────────────────────────

const primaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const ghostBtn =
  'inline-flex h-11 items-center gap-1 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

// ── Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 pt-36 sm:pt-44">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-14 lg:grid-cols-[1fr,auto] lg:items-center lg:gap-16">

            {/* Left: copy */}
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                Send the estimate.<br className="hidden sm:block" /> Get the yes.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Jobigram helps HVAC, plumbing, and electrical crews quote jobs, schedule them, and follow up — with estimates customers approve from their phone.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/signup" className={primaryBtn}>
                  Start free trial <ArrowRight className="size-4" />
                </Link>
                <a href="#demo" className={ghostBtn}>
                  Try the demo →
                </a>
              </div>
              <p className="mt-4 text-xs text-muted-foreground/55">
                {TRIAL_DAYS}-day free trial · No credit card required · Cancel any time
              </p>
            </div>

            {/* Right: interactive demo */}
            <div id="demo">
              <HeroDemo />
            </div>

          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-muted/40 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              From new job to completed work in three steps.
            </p>
          </div>
          <ol className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex flex-col gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/8">
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
          <div className="mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything your crew needs
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Built specifically for HVAC, plumbing, and electrical contractors.
            </p>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {FEATURES.map(({ Icon, title, body, comingSoon }) => (
              <li
                key={title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4.5 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  {comingSoon && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Pricing preview ──────────────────────────────────────── */}
      <section id="pricing" className="bg-muted/40 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Plans from ${PLANS[0].price}/month · {TRIAL_DAYS}-day free trial · No credit card required
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every plan includes all features. Plans differ only by team size.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team size</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price/mo</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map((plan, i) => (
                  <tr
                    key={plan.name}
                    className={i < PLANS.length - 1 ? 'border-b border-border' : ''}
                  >
                    <td className="px-5 py-3.5 font-medium text-foreground">{plan.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {plan.cap >= 10_000 ? 'Unlimited' : `Up to ${plan.cap}`}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-foreground">
                      ${plan.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link
              href="/pricing"
              className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              See all plans →
            </Link>
            <Link href="/signup" className={primaryBtn}>
              Start free trial <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12">
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
            Start your {TRIAL_DAYS}-day free trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={primaryBtn}>
              Start free trial <ArrowRight className="size-4" />
            </Link>
            <Link href="/contact" className={ghostBtn}>
              Talk to us →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
