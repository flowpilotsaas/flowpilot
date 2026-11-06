'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ONLINE_PAYMENTS_LIVE } from '@/lib/site-config'

// ── Visuals ─────────────────────────────────────────────────────────────

function EstimatesVisual() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">Estimate #142</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Sent</span>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Gutter cleaning</span><span>$120.00</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Downspout flush</span><span>$45.00</span>
        </div>
        <div className="flex justify-between text-xs font-semibold text-foreground border-t border-border pt-2">
          <span>Total</span><span>$165.00</span>
        </div>
      </div>
      <div className="mt-4 rounded-full bg-primary py-2 text-center text-xs font-semibold text-primary-foreground">
        Approve estimate
      </div>
    </div>
  )
}

function ApprovedEstimateVisual() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">Estimate #142</span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: '#dcfce7', color: '#16a34a' }}
        >
          Approved
        </span>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Gutter cleaning</span><span>$120.00</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Downspout flush</span><span>$45.00</span>
        </div>
        <div className="flex justify-between text-xs font-semibold text-foreground border-t border-border pt-2">
          <span>Total</span><span>$165.00</span>
        </div>
      </div>
      <div
        className="mt-4 rounded-full py-2 text-center text-xs font-semibold"
        style={{ background: '#dcfce7', color: '#16a34a' }}
      >
        ✓ Approved by customer
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
          ) : <div key={`r1-${i}`} />
        )}
        {row2.map((b, i) =>
          b ? (
            <div key={`r2-${i}`} className="rounded bg-muted p-1 text-[9px] leading-tight text-muted-foreground">
              {b.label}
            </div>
          ) : <div key={`r2-${i}`} />
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

// ── Event data ───────────────────────────────────────────────────────────

type EventItem = {
  id: string
  time: string
  title: string
  caption: string
  icon: 'document' | 'check' | 'calendar' | 'bell' | 'person'
  Visual: () => React.ReactElement
  pct: number // horizontal position on the timeline (0–100)
}

const EVENTS: EventItem[] = [
  {
    id: 'estimate-sent',
    time: '9:00 AM',
    title: 'Estimate sent',
    caption: 'Build a line-item estimate and share a link. The customer sees it on any device.',
    icon: 'document',
    Visual: EstimatesVisual,
    pct: 0,
  },
  {
    id: 'customer-approves',
    time: '10:30 AM',
    title: 'Customer approves',
    caption: 'The customer taps Approve from their phone. You get notified immediately.',
    icon: 'check',
    Visual: ApprovedEstimateVisual,
    pct: 25,
  },
  {
    id: 'job-scheduled',
    time: '1:00 PM',
    title: 'Job scheduled',
    caption: "Drop the job on the calendar. Your crew sees the update right away.",
    icon: 'calendar',
    Visual: SchedulingVisual,
    pct: 50,
  },
  {
    id: 'reminder-sent',
    time: '4:00 PM',
    title: 'Reminder sent',
    caption: 'An automated reminder goes out before the appointment — no manual follow-up.',
    icon: 'bell',
    Visual: RemindersVisual,
    pct: 75,
  },
  {
    id: 'history-saved',
    time: '5:00 PM',
    title: 'Customer history saved',
    caption: 'Every job, estimate, and note is saved to the customer record automatically.',
    icon: 'person',
    Visual: CustomersVisual,
    pct: 100,
  },
]

// ── Dot icons ────────────────────────────────────────────────────────────

const DOT_ICON_SIZE = 10

function DotIcon({ icon, active }: { icon: EventItem['icon']; active: boolean }) {
  const stroke = active ? '#fff' : '#5B6068'
  const common = { width: DOT_ICON_SIZE, height: DOT_ICON_SIZE, viewBox: '0 0 24 24', fill: 'none' as const, stroke, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (icon === 'document') return (
    <svg {...common}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
  if (icon === 'check') return (
    <svg {...common} strokeWidth={3}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
  if (icon === 'calendar') return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
  if (icon === 'bell') return (
    <svg {...common}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
  return (
    <svg {...common}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ── Constants ────────────────────────────────────────────────────────────

const CARD_WIDTH = 300
const CARD_AREA_HEIGHT = 240 // px; tall enough for the deepest card
const DOT_D = 20            // dot diameter px
const LINE_TOP = 10          // px from top of timeline row to line center

// ── Main component ──────────────────────────────────────────────────────

export default function FeatureTabs() {
  const [selected, setSelected] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [containerWidth, setContainerWidth] = useState(840)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const timelineRef = useRef<HTMLDivElement>(null)
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const h = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function pick(i: number) {
    setSelected(i)
    setAnimKey((k) => k + 1)
  }

  function handleDotKey(e: React.KeyboardEvent, i: number) {
    if (e.key === 'ArrowRight') {
      const n = (i + 1) % EVENTS.length
      dotRefs.current[n]?.focus()
      pick(n)
    } else if (e.key === 'ArrowLeft') {
      const n = (i - 1 + EVENTS.length) % EVENTS.length
      dotRefs.current[n]?.focus()
      pick(n)
    } else if (e.key === 'Home') { dotRefs.current[0]?.focus(); pick(0) }
    else if (e.key === 'End') { dotRefs.current[EVENTS.length - 1]?.focus(); pick(EVENTS.length - 1) }
  }

  // Card left position, clamped so card never overflows the container
  function cardLeft(i: number): number {
    const dotX = (EVENTS[i].pct / 100) * containerWidth
    return Math.max(0, Math.min(containerWidth - CARD_WIDTH, dotX - CARD_WIDTH / 2))
  }

  // Pointer x offset within the card wrapper (aligns pointer tip with dot center)
  function pointerOffset(i: number): number {
    return (EVENTS[i].pct / 100) * containerWidth - cardLeft(i)
  }

  const tr = (ms: number) => prefersReducedMotion ? 'none' : `all ${ms}ms ease`

  const { Visual } = EVENTS[selected]

  return (
    <>
      <style>{`
        @keyframes day-card-enter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <p className="mb-8 text-sm text-muted-foreground">
        Follow a typical day, from first estimate to final reminder.
      </p>

      {/* ── DESKTOP ── */}
      <div ref={timelineRef} className="hidden sm:block" aria-label="Day timeline">

        {/* Card area — fixed height reserves space; cards hang from bottom */}
        <div
          aria-live="off"
          style={{ position: 'relative', height: CARD_AREA_HEIGHT, overflow: 'visible' }}
        >
          {/* Wrapper slides left/right to stay centered above selected dot */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: cardLeft(selected),
              width: CARD_WIDTH,
              transition: tr(300),
            }}
          >
            {/* Card content — remounts on selection to replay enter animation */}
            <div
              key={animKey}
              className="relative z-10"
              style={
                prefersReducedMotion
                  ? undefined
                  : { animation: 'day-card-enter 250ms ease-out', animationFillMode: 'both' }
              }
            >
              <Visual />
            </div>

            {/* Diamond pointer: two-layer bordered arrow pointing down */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: -8,
                left: pointerOffset(selected),
                transform: 'translateX(-50%) rotate(45deg)',
                width: 12,
                height: 12,
                background: '#ffffff', // var(--card)
                borderRight: '1.5px solid #DDD9CE', // var(--border)
                borderBottom: '1.5px solid #DDD9CE',
                zIndex: 9,
                transition: tr(300),
              }}
            />
          </div>
        </div>

        {/* Timeline row: line + dots */}
        <div style={{ position: 'relative', height: 56, marginTop: 2 }}>
          {/* Background line */}
          <div
            style={{
              position: 'absolute',
              top: LINE_TOP,
              left: 0,
              right: 0,
              height: 2,
              background: '#DDD9CE',
            }}
          />
          {/* Primary fill line */}
          <div
            style={{
              position: 'absolute',
              top: LINE_TOP,
              left: 0,
              width: `${EVENTS[selected].pct}%`,
              height: 2,
              background: '#2457F5',
              transition: tr(300),
            }}
          />

          {/* Event dots */}
          {EVENTS.map((ev, i) => {
            const isActive = i === selected
            return (
              <button
                key={ev.id}
                ref={(el) => { dotRefs.current[i] = el }}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                aria-label={`${ev.title} at ${ev.time}`}
                onClick={() => pick(i)}
                onKeyDown={(e) => handleDotKey(e, i)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${ev.pct}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                {/* Circle */}
                <div
                  style={{
                    width: DOT_D,
                    height: DOT_D,
                    borderRadius: '50%',
                    background: isActive ? '#2457F5' : '#ffffff',
                    border: `1.5px solid ${isActive ? '#2457F5' : '#DDD9CE'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                    transition: tr(200),
                  }}
                >
                  <DotIcon icon={ev.icon} active={isActive} />
                </div>
                {/* Time */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#2457F5' : '#5B6068',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {ev.time}
                </span>
              </button>
            )
          })}
        </div>

        {/* Captions row */}
        <div
          role="tablist"
          aria-label="Event captions"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
            marginTop: 20,
          }}
        >
          {EVENTS.map((ev, i) => {
            const isActive = i === selected
            return (
              <button
                key={ev.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => pick(i)}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg p-2 -m-2"
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActive ? '#14161B' : '#5B6068',
                    marginBottom: 2,
                    transition: tr(200),
                  }}
                >
                  {ev.title}
                </p>
                <p style={{ fontSize: 11, color: '#5B6068', lineHeight: 1.4 }}>
                  {ev.caption}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="sm:hidden" aria-live="off">
        <div style={{ position: 'relative', paddingLeft: 36 }}>
          {/* Vertical background line */}
          <div
            style={{
              position: 'absolute',
              left: 9,
              top: 10,
              bottom: 10,
              width: 2,
              background: '#DDD9CE',
            }}
          />
          {/* Primary fill line (top portion up to selected dot) */}
          <div
            style={{
              position: 'absolute',
              left: 9,
              top: 10,
              // Height grows as selected index increases; each event row is ~88px tall
              height: `calc(${selected} * 88px)`,
              width: 2,
              background: '#2457F5',
              transition: tr(300),
            }}
          />

          {EVENTS.map((ev, i) => {
            const isActive = i === selected
            return (
              <div
                key={ev.id}
                style={{ marginBottom: i < EVENTS.length - 1 ? 28 : 0, position: 'relative' }}
              >
                {/* Dot button on the vertical line */}
                <button
                  ref={(el) => { if (!dotRefs.current[i]) dotRefs.current[i] = el }}
                  aria-label={`${ev.title} at ${ev.time}`}
                  aria-pressed={isActive}
                  onClick={() => pick(i)}
                  onKeyDown={(e) => handleDotKey(e, i)}
                  tabIndex={isActive ? 0 : -1}
                  style={{
                    position: 'absolute',
                    left: -27,
                    top: 0,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
                >
                  <div
                    style={{
                      width: DOT_D,
                      height: DOT_D,
                      borderRadius: '50%',
                      background: isActive ? '#2457F5' : '#ffffff',
                      border: `1.5px solid ${isActive ? '#2457F5' : '#DDD9CE'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      transition: tr(200),
                    }}
                  >
                    <DotIcon icon={ev.icon} active={isActive} />
                  </div>
                </button>

                {/* Time + title (tappable) */}
                <button
                  onClick={() => pick(i)}
                  className="text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10,
                      fontWeight: 500,
                      color: isActive ? '#2457F5' : '#5B6068',
                    }}
                  >
                    {ev.time}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? '#14161B' : '#5B6068',
                      marginBottom: isActive ? 10 : 0,
                      transition: tr(200),
                    }}
                  >
                    {ev.title}
                  </span>
                </button>

                {/* Card below the selected dot */}
                {isActive && (
                  <div
                    key={animKey}
                    style={
                      prefersReducedMotion
                        ? undefined
                        : { animation: 'day-card-enter 250ms ease-out', animationFillMode: 'both' }
                    }
                  >
                    <ev.Visual />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
