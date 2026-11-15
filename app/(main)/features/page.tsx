import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TRIAL_DAYS } from '@/lib/plans'
import { ONLINE_PAYMENTS_LIVE } from '@/lib/site-config'
import FeatureTabs from '@/components/marketing/FeatureTabs'

export const metadata: Metadata = {
  title: 'Features — Jobigram',
  description: 'Estimates, scheduling, reminders, and customer records — everything a field service team needs in one place.',
}

const FEATURE_GROUPS = [
  {
    heading: 'Estimates and approval',
    body: 'Build an estimate from a line-item pricebook and send it in seconds. Your customer gets an email with a secure link — no account needed. They review it on any device and tap Approve or Decline.',
    bullets: [
      'Line-item estimates with custom pricing',
      'Customer approves or declines by email link',
      'Approved estimates convert to jobs with one click',
      ...(ONLINE_PAYMENTS_LIVE
        ? ['Collect payment directly from the approval email']
        : ['Online payments — coming soon']),
    ],
  },
  {
    heading: 'Scheduling',
    body: 'Put approved jobs on a shared calendar your whole team can see. Assign technicians, set time slots, and keep the schedule up to date as jobs move.',
    bullets: [
      'Drag-and-drop job calendar',
      'Assign jobs to any team member',
      'Job status tracking from scheduled to complete',
    ],
  },
  {
    heading: 'Customers',
    body: 'Every customer gets a record that grows over time. Store contact details, addresses, and notes — and see the full job history at a glance.',
    bullets: [
      'Customer database with contact details',
      'Full job and estimate history per customer',
      'Notes and address fields',
    ],
  },
  {
    heading: 'Reminders',
    body: 'Send automated reminders so customers always know when you\'re coming. Reminders go out by email or SMS without any manual work.',
    bullets: [
      'Automated email reminders',
      'SMS reminders via Twilio',
      'Reminder templates for confirmations and follow-ups',
    ],
  },
  {
    heading: 'Team management',
    body: 'Invite your team and control who can do what. Owners and admins can invite members; technicians see only what they need.',
    bullets: [
      'Invite team members by email',
      'Admin and technician roles',
      'Per-plan team-size cap (2 to unlimited)',
    ],
  },
]

export default function FeaturesPage() {
  return (
    <>
      {/* ── Header + FeatureTabs ─────────────────────────────────── */}
      <section className="px-6 pb-20 pt-36 sm:pt-44">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
              Everything you need to run every job
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              From the first estimate to the final reminder, all in one place.
            </p>
          </div>
          <FeatureTabs />
        </div>
      </section>

      {/* ── Feature groups ───────────────────────────────────────── */}
      <section className="px-6 pb-20 sm:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-16 sm:grid-cols-2">
            {FEATURE_GROUPS.map((g) => (
              <div key={g.heading}>
                <h2 className="mb-3 text-xl font-bold text-foreground">
                  {g.heading}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {g.body}
                </p>
                <ul className="space-y-2">
                  {g.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#2457F5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className={b.includes('coming soon') ? 'text-muted-foreground' : ''}>
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-2xl rounded-2xl bg-foreground px-8 py-14 text-center">
          <h2 className="text-2xl font-bold text-background sm:text-3xl">
            Start sending estimates your customers can approve from their phone
          </h2>
          <p className="mt-3 text-sm text-background/60">
            {TRIAL_DAYS}-day free trial. No credit card required.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-background/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
            >
              Start free trial <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
