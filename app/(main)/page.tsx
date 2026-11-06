import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TRIAL_DAYS } from '@/lib/plans'
import ProcessVisual from '@/components/marketing/ProcessVisual'
import FeatureTabs from '@/components/marketing/FeatureTabs'
import PricingPicker from '@/components/marketing/PricingPicker'
import FaqAccordion from '@/components/marketing/FaqAccordion'

export const metadata: Metadata = {
  title: 'Jobigram — Field Service Management Software',
  description:
    'Send estimates, get online approvals, schedule jobs, and automate follow-up reminders. Start your 30-day free trial — no credit card required.',
  openGraph: {
    title: 'Jobigram — Field Service Management Software',
    description:
      'Send estimates, get online approvals, schedule jobs, and automate follow-up reminders.',
    type: 'website',
  },
}

// ── Shared styles ──────────────────────────────────────────────────────

const primaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// ── Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 pt-36 sm:pt-44">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">

            {/* Left: copy */}
            <div>
              <h1 className="text-4xl font-extrabold leading-[1.1] text-foreground sm:text-5xl lg:text-[3.25rem]">
                Run your whole service business{' '}
                <span className="text-primary">from one place</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Send an estimate, get it approved from your customer&apos;s phone, put the job on the calendar, and let reminders handle the follow-up. All in one place.
              </p>
              <div className="mt-8">
                <Link href="/signup" className={primaryBtn}>
                  Start free trial <ArrowRight className="size-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground/70">
                {TRIAL_DAYS}-day free trial · No credit card required · Cancel any time
              </p>
            </div>

            {/* Right: animated process visual */}
            <div className="w-full">
              <ProcessVisual />
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="bg-muted/40 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything you need to run every job
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              From first estimate to completed work, all in one place.
            </p>
          </div>
          <FeatureTabs />
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="bg-muted/40 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <PricingPicker />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          <FaqAccordion />
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
