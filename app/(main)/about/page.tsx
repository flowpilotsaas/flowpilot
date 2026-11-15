import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TRIAL_DAYS } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'About — Jobigram',
  description: 'Jobigram is field service management software built to make it simple to send estimates, schedule jobs, and follow up with customers.',
}

export default function AboutPage() {
  return (
    <>
      <section className="px-6 pb-20 pt-36 sm:pt-44">
        <div className="mx-auto" style={{ maxWidth: 680 }}>

          <h1 className="mb-6 text-4xl font-bold text-foreground sm:text-5xl">
            Built for the people who keep homes running
          </h1>

          <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
            Running a service business means juggling estimates, schedules, follow-ups, and customers all at once — often from a truck, not a desk. Jobigram exists to make that simpler: send an estimate in minutes, let your customer approve it from their phone, put the job on the calendar, and let automated reminders handle the follow-up. Everything in one place, nothing unnecessary.
          </p>

          <h2 className="mb-5 text-xl font-bold text-foreground">What we believe</h2>
          <ul className="space-y-4">
            {[
              {
                label: 'Simple to use.',
                detail: 'If it takes a manual to figure out, it won\'t get used. Every screen should feel obvious.',
              },
              {
                label: 'Honest pricing.',
                detail: 'One price per team size, every feature included. No add-ons, no feature tiers, no surprises on the bill.',
              },
              {
                label: 'Built for service work.',
                detail: 'Not a generic CRM bolted onto a calendar. The whole product is designed around how field service jobs actually flow.',
              },
            ].map(({ label, detail }) => (
              <li key={label} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 shrink-0 text-primary">—</span>
                <span>
                  <span className="font-semibold text-foreground">{label}</span>{' '}
                  <span className="text-muted-foreground">{detail}</span>
                </span>
              </li>
            ))}
          </ul>

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
