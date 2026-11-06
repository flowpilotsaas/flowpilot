'use client'

import React, { useEffect, useRef, useState } from 'react'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'
import { ONLINE_PAYMENTS_LIVE } from '@/lib/site-config'

function buildFaqs() {
  const smallestCap = PLANS[0].cap // 2 (Kickstart)
  const hasUnlimited = PLANS.some((p) => p.cap >= 10_000)

  return [
    {
      q: `How long is the free trial?`,
      a: `${TRIAL_DAYS} days — no credit card required. Every feature is available during the trial so you can see exactly what you're signing up for.`,
    },
    {
      q: 'Can my whole team use it?',
      a: `Yes. Once you subscribe, you can invite your whole team. Plans start at ${smallestCap} team members and go up to ${hasUnlimited ? 'unlimited' : `${PLANS[PLANS.length - 1].cap}`}. Every plan includes every feature — plans differ only in team size.`,
    },
    {
      q: 'Can I cancel any time?',
      a: 'Yes. Cancel at any time from your billing settings. No contracts, no cancellation fees, no hassle.',
    },
    {
      q: 'How does the estimate approval work?',
      a: "When you send an estimate, your customer gets an email with a secure link. They can open it on any device, review the line items, and tap Approve or Decline — no account required.",
    },
    {
      q: 'Does Jobigram work on mobile?',
      a: 'Yes. The dashboard is fully responsive and works in any modern mobile browser. No separate app download needed.',
    },
    {
      q: 'Do I need Stripe?',
      a: ONLINE_PAYMENTS_LIVE
        ? 'No. Scheduling, customers, estimates, and reminders all work without Stripe. You only need it if you want to accept online card payments.'
        : 'No. Scheduling, customers, estimates, and reminders all work without Stripe. Online payments are coming soon.',
    },
    {
      q: 'How do I get help?',
      a: 'Email support is included on every plan. We aim to respond within one business day.',
    },
  ]
}

const FAQS = buildFaqs()

export default function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [prefersRM, setPrefersRM] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersRM(mq.matches)
    const h = () => setPrefersRM(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  return (
    <div>
      <h2
        className="mb-10 text-3xl font-bold text-foreground sm:text-4xl"
        style={{ fontFamily: 'var(--font-display), sans-serif' }}
      >
        Questions, answered
      </h2>

      <dl>
        {FAQS.map((faq, i) => {
          const isOpen   = openIdx === i
          const panelId  = `faq-panel-${i}`
          const btnId    = `faq-btn-${i}`

          return (
            <div key={faq.q} className="border-t border-border last:border-b">
              <dt>
                <button
                  id={btnId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span
                    className="text-foreground"
                    style={{ fontSize: 19, fontWeight: 600, fontFamily: 'var(--font-display), sans-serif', lineHeight: 1.3 }}
                  >
                    {faq.q}
                  </span>

                  {/* Plus → minus icon */}
                  <svg
                    width={18}
                    height={18}
                    viewBox="0 0 18 18"
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground"
                  >
                    <line x1="1" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line
                      x1="9" y1="1" x2="9" y2="17"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                      style={{
                        transformOrigin: '9px 9px',
                        transform: isOpen ? 'scaleY(0)' : 'scaleY(1)',
                        transition: prefersRM ? 'none' : 'transform 200ms ease',
                      }}
                    />
                  </svg>
                </button>
              </dt>

              {/* Height-animated panel via CSS grid trick */}
              <dd
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                style={{
                  display: 'grid',
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  transition: prefersRM ? 'none' : 'grid-template-rows 250ms ease',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </div>
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
