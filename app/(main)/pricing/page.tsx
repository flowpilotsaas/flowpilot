import type { Metadata } from 'next'
import { TRIAL_DAYS } from '@/lib/plans'
import PricingPicker from '@/components/marketing/PricingPicker'
import FaqAccordion from '@/components/marketing/FaqAccordion'

export const metadata: Metadata = {
  title: 'Pricing — Jobigram',
  description: `Every plan includes every feature. ${TRIAL_DAYS}-day free trial, no credit card required.`,
}

export default function PricingPage() {
  return (
    <div className="px-6 pb-20 pt-36 sm:pt-44">
      <div className="mx-auto max-w-5xl">
        <PricingPicker />
      </div>

      <div className="mx-auto mt-20 sm:mt-28" style={{ maxWidth: 720 }}>
        <FaqAccordion />
      </div>
    </div>
  )
}
