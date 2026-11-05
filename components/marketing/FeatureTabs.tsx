'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ONLINE_PAYMENTS_LIVE } from '@/lib/site-config'

// ── Tab data ────────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'estimates',
    short: 'Estimates',
    heading: 'Create and send estimates',
    body: 'Build a line-item estimate and share a secure link. Your customer approves or declines from any device — no phone tag.',
    bullets: [
      'Build estimates from your own line items',
      'Customers approve with one tap from the link',
      ...(ONLINE_PAYMENTS_LIVE ? ['Accept card payments directly from the estimate'] : []),
      'Track status and get notified when they respond',
    ],
  },
  {
    id: 'scheduling',
    short: 'Scheduling',
    heading: 'Schedule jobs on a calendar',
    body: "Drag jobs onto your team's shared calendar and see every appointment at a glance.",
    bullets: [
      'Assign jobs to any team member',
      'See open slots and prevent double-bookings',
      'Your crew sees schedule changes in real time',
    ],
  },
  {
    id: 'reminders',
    short: 'Reminders',
    heading: 'Send customer reminders',
    body: 'Automated email and SMS reminders go out before every appointment so no-shows stop happening.',
    bullets: [
      'Set up once; reminders send automatically',
      'Customers can reply and you see the message',
      'Reduce no-shows without picking up the phone',
    ],
  },
  {
    id: 'customers',
    short: 'Customers',
    heading: 'Keep every customer in one place',
    body: 'Every job, estimate, and note lives on a single customer record so you always know the history.',
    bullets: [
      'Full job and estimate history per customer',
      'Search and filter your whole customer list',
      'Add notes and contact details for your team',
    ],
  },
]

// ── Static visuals ──────────────────────────────────────────────────────

function EstimatesVisual() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">Estimate #142</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Sent</span>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Gutter cleaning</span>
          <span>$120.00</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Downspout flush</span>
          <span>$45.00</span>
        </div>
        <div className="flex justify-between text-xs font-semibold text-foreground border-t border-border pt-2">
          <span>Total</span>
          <span>$165.00</span>
        </div>
      </div>
      <div className="mt-4 rounded-full bg-primary py-2 text-center text-xs font-semibold text-primary-foreground">
        Approve estimate
      </div>
    </div>
  )
}

function SchedulingVisual() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const row1 = [
    { label: '9 am · Rivera', accent: false },
    { label: '10 am · Chen', accent: true },
    null,
    { label: '8 am · Park', accent: false },
    null,
  ]
  const row2 = [
    null,
    { label: '2 pm · Okafor', accent: false },
    { label: '11 am · Ross', accent: false },
    null,
    { label: '3 pm · Lee', accent: false },
  ]
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d) => (
          <div key={d} className="pb-1 text-center text-[10px] font-semibold text-muted-foreground">{d}</div>
        ))}
        {row1.map((b, i) =>
          b ? (
            <div
              key={`r1-${i}`}
              className={`rounded p-1 text-[9px] leading-tight ${
                b.accent ? 'bg-primary/15 font-semibold text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {b.label}
            </div>
          ) : (
            <div key={`r1-${i}`} />
          )
        )}
        {row2.map((b, i) =>
          b ? (
            <div key={`r2-${i}`} className="rounded bg-muted p-1 text-[9px] leading-tight text-muted-foreground">
              {b.label}
            </div>
          ) : (
            <div key={`r2-${i}`} />
          )
        )}
      </div>
    </div>
  )
}

function RemindersVisual() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="max-w-[90%] rounded-xl rounded-tl-none bg-muted p-3">
        <p className="text-[10px] font-semibold text-foreground mb-0.5">Jobigram</p>
        <p className="text-xs text-muted-foreground">
          Hi Alex — your appointment is confirmed for tomorrow at 2 pm. Reply STOP to unsubscribe.
        </p>
      </div>
      <div className="ml-auto max-w-[75%] rounded-xl rounded-tr-none bg-primary/10 p-3">
        <p className="text-xs text-primary">Got it, thanks!</p>
      </div>
    </div>
  )
}

function CustomersVisual() {
  // Customer type only stores name/email/phone/address/notes — no last-contact date.
  // Using email + job/estimate count, which is what a customer list would show.
  const rows = [
    { name: 'Alex Rivera', detail: 'alex@example.com · 4 jobs', chip: 'Active', accent: false },
    { name: 'Sam Okafor', detail: 'sam@example.com · 1 estimate pending', chip: 'Pending', accent: true },
    { name: 'Jordan Lee', detail: 'jordan@example.com · 7 jobs', chip: 'Active', accent: false },
  ]
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm divide-y divide-border">
      {rows.map((row) => (
        <div key={row.name} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{row.detail}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              row.accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {row.chip}
          </span>
        </div>
      ))}
    </div>
  )
}

const VISUALS = [EstimatesVisual, SchedulingVisual, RemindersVisual, CustomersVisual]

// ── Main component ──────────────────────────────────────────────────────

export default function FeatureTabs() {
  const [active, setActive] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  // Increments when auto-timing resumes after a pause, to restart the progress bar from 0.
  const [progressKey, setProgressKey] = useState(0)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const sectionRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasRunningRef = useRef(false)

  // Detect prefers-reduced-motion on the client
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // IntersectionObserver: start only when 40% of the section is visible
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const isRunning = autoAdvance && visible && !paused && !prefersReducedMotion

  // When timing resumes after a pause, restart the progress bar from 0 so it
  // stays in sync with the freshly-started interval.
  useEffect(() => {
    if (!wasRunningRef.current && isRunning) {
      setProgressKey((k) => k + 1)
    }
    wasRunningRef.current = isRunning
  }, [isRunning])

  // Auto-advance interval — cleared whenever any blocking condition changes
  useEffect(() => {
    if (!autoAdvance || !visible || paused || prefersReducedMotion) return
    const id = setInterval(() => {
      setActive((a) => (a + 1) % TABS.length)
    }, 6000)
    return () => clearInterval(id)
  }, [autoAdvance, visible, paused, prefersReducedMotion])

  // Pause on hover — event handlers on the wrapper
  const handleMouseEnter = () => setPaused(true)
  const handleMouseLeave = () => setPaused(false)

  // Pause on focus inside the section. Debounce blur so moving focus between
  // elements inside the section doesn't briefly unpause.
  const handleFocusCapture = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    setPaused(true)
  }
  const handleBlurCapture = () => {
    blurTimeoutRef.current = setTimeout(() => setPaused(false), 0)
  }

  function stopAutoAdvance() {
    setAutoAdvance(false)
  }

  function handleTabClick(i: number) {
    setActive(i)
    stopAutoAdvance()
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === 'ArrowRight') {
      const n = (i + 1) % TABS.length
      tabRefs.current[n]?.focus()
      setActive(n)
      stopAutoAdvance()
    } else if (e.key === 'ArrowLeft') {
      const n = (i - 1 + TABS.length) % TABS.length
      tabRefs.current[n]?.focus()
      setActive(n)
      stopAutoAdvance()
    } else if (e.key === 'Home') {
      tabRefs.current[0]?.focus()
      setActive(0)
      stopAutoAdvance()
    } else if (e.key === 'End') {
      const last = TABS.length - 1
      tabRefs.current[last]?.focus()
      setActive(last)
      stopAutoAdvance()
    }
  }

  const showProgress = autoAdvance && !prefersReducedMotion

  return (
    <>
      {/* Keyframes injected once; React 19 hoists <style> tags automatically */}
      <style>{`
        @keyframes ft-panel-enter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes ft-tab-progress {
          from { width: 0%;    }
          to   { width: 100%;  }
        }
      `}</style>

      <div
        ref={sectionRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        {/* Tab list */}
        <div role="tablist" aria-label="Feature areas" className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active === i}
              aria-controls={`tabpanel-${tab.id}`}
              ref={(el) => { tabRefs.current[i] = el }}
              tabIndex={active === i ? 0 : -1}
              onClick={() => handleTabClick(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`relative overflow-hidden rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active === i
                  ? 'bg-foreground text-background'
                  : 'border border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground'
              }`}
            >
              {tab.short}
              {/* Progress bar: fills over 6 s while this tab is active and auto-advancing */}
              {active === i && showProgress && (
                <span
                  key={`${i}-${progressKey}`}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '2px',
                    background: active === i ? 'rgba(246,244,238,0.5)' : '#2457F5',
                    animation: 'ft-tab-progress 6s linear forwards',
                    animationPlayState: isRunning ? 'running' : 'paused',
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Panels — min-height reserves space so layout below never shifts.
            aria-live="off" suppresses announcements from auto-advances. */}
        <div className="min-h-[300px] sm:min-h-[220px]" aria-live="off">
          {TABS.map((tab, i) => {
            const PanelVisual = VISUALS[i]
            const isActive = active === i
            return (
              <div
                key={tab.id}
                role="tabpanel"
                id={`tabpanel-${tab.id}`}
                aria-labelledby={`tab-${tab.id}`}
                hidden={!isActive}
                className="grid gap-8 sm:grid-cols-2 sm:gap-12 sm:items-start"
                style={
                  isActive && !prefersReducedMotion
                    ? { animation: 'ft-panel-enter 250ms ease-out', animationFillMode: 'both' }
                    : undefined
                }
              >
                {/* Left: copy */}
                <div>
                  <h3 className="text-xl font-bold text-foreground sm:text-2xl">{tab.heading}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tab.body}</p>
                  <ul className="mt-5 space-y-2">
                    {tab.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Right: visual */}
                <PanelVisual />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
