'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'
import { ONLINE_PAYMENTS_LIVE } from '@/lib/site-config'

// Derive size-button labels from plan caps so labels stay in sync if caps change
const SIZES = PLANS.map((p, i, arr) => {
  const prevCap = i === 0 ? 0 : arr[i - 1].cap
  const label = p.cap >= 10_000 ? '50+' : `${prevCap + 1}–${p.cap}`
  return { label, plan: p }
})

const FEATURES = [
  'Estimates with online approval',
  'Job scheduling & calendar',
  'Customer records',
  'Email & SMS reminders',
  'Team management',
]

export default function PricingPicker() {
  const DEFAULT_IDX = 1 // Standard (3–5)
  const [selectedIdx, setSelectedIdx] = useState(DEFAULT_IDX)
  const [displayPrice, setDisplayPrice] = useState(SIZES[DEFAULT_IDX].plan.price)
  const [prefersRM, setPrefersRM] = useState(false)

  const sizeRefs   = useRef<(HTMLButtonElement | null)[]>([])
  const animRef    = useRef<number | null>(null)
  const prevPrice  = useRef(SIZES[DEFAULT_IDX].plan.price)

  const plan = SIZES[selectedIdx].plan

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersRM(mq.matches)
    const h = () => setPrefersRM(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    const start = prevPrice.current
    const end = plan.price
    if (prefersRM || start === end) {
      setDisplayPrice(end)
      prevPrice.current = end
      return
    }
    const duration = 400
    const t0 = performance.now()
    if (animRef.current) cancelAnimationFrame(animRef.current)
    function step(now: number) {
      const t = Math.min((now - t0) / duration, 1)
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // ease in-out quad
      setDisplayPrice(Math.round(start + (end - start) * e))
      if (t < 1) animRef.current = requestAnimationFrame(step)
      else prevPrice.current = end
    }
    animRef.current = requestAnimationFrame(step)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [plan.price, prefersRM])

  function handleKey(e: React.KeyboardEvent, i: number) {
    let n: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')      n = (i + 1) % SIZES.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')    n = (i - 1 + SIZES.length) % SIZES.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End')  n = SIZES.length - 1
    if (n !== null) { e.preventDefault(); setSelectedIdx(n); sizeRefs.current[n]?.focus() }
  }

  const teamLabel = plan.cap >= 10_000 ? 'Unlimited team members' : `Up to ${plan.cap} team members`
  const fadeStyle = prefersRM ? {} : { animation: 'pricing-fade 200ms ease-out', animationFillMode: 'both' as const }

  return (
    <>
      <style>{`@keyframes pricing-fade { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* Heading */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
          Simple pricing that grows with your team
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Every plan includes every feature. You only pay more as your team grows.
        </p>
      </div>

      {/* Layout */}
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-12">

        {/* Left: size picker */}
        <div className="shrink-0 sm:w-56">
          <p className="mb-4 text-base font-semibold text-foreground">How big is your team?</p>
          <div
            role="radiogroup"
            aria-label="Team size"
            className="grid grid-cols-3 gap-2 sm:flex sm:flex-col sm:gap-2"
          >
            {SIZES.map((sz, i) => {
              const isSel = i === selectedIdx
              return (
                <button
                  key={sz.label}
                  ref={(el) => { sizeRefs.current[i] = el }}
                  role="radio"
                  aria-checked={isSel}
                  tabIndex={isSel ? 0 : -1}
                  onClick={() => setSelectedIdx(i)}
                  onKeyDown={(e) => handleKey(e, i)}
                  onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.borderColor = '#2457F5' }}
                  onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.borderColor = '#DDD9CE' }}
                  style={{
                    height: 56,
                    borderRadius: 14,
                    border: `1px solid ${isSel ? '#2457F5' : '#DDD9CE'}`,
                    background: isSel ? '#2457F5' : '#ffffff',
                    color: isSel ? '#ffffff' : '#14161B',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    outline: 'none',
                  }}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {sz.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: plan card + checklist */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded-2xl border border-border bg-card p-7 shadow-sm"
            style={{ minHeight: 300 }}
          >
            {/* Crossfades when plan changes */}
            <div key={plan.name} style={fadeStyle}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span
                  className="font-bold text-foreground"
                  style={{ fontSize: 64, lineHeight: 1, fontFamily: 'var(--font-display), sans-serif' }}
                >
                  ${displayPrice}
                </span>
                <span className="text-base text-muted-foreground">/month</span>
              </div>
              <p className="mb-7 text-sm text-muted-foreground">{teamLabel}</p>
            </div>

            <Link
              href="/signup"
              className="block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Start free trial
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {TRIAL_DAYS}-day free trial · No credit card required
            </p>
          </div>

          {/* Universal feature checklist */}
          <ul className="mt-5 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#2457F5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
            {!ONLINE_PAYMENTS_LIVE && (
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Online payments — coming soon
              </li>
            )}
          </ul>

          <p className="mt-5 text-xs text-muted-foreground">Billed monthly. Cancel any time.</p>
        </div>
      </div>
    </>
  )
}
