'use client'

import React, { useEffect, useRef, useState } from 'react'

// ── Visuals (sized for the wider 480px card) ─────────────────────────────

function EstimatesVisual() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-semibold text-foreground">Estimate #142</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Sent</span>
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Gutter cleaning</span><span>$120.00</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Downspout flush</span><span>$45.00</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="font-bold text-foreground" style={{ fontSize: 28, lineHeight: 1 }}>$165.00</span>
        </div>
      </div>
      <div className="mt-5 rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">
        Approve estimate
      </div>
    </div>
  )
}

function ApprovedEstimateVisual() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-semibold text-foreground">Estimate #142</span>
        <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: '#dcfce7', color: '#16a34a' }}>
          Approved
        </span>
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Gutter cleaning</span><span>$120.00</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Downspout flush</span><span>$45.00</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="font-bold text-foreground" style={{ fontSize: 28, lineHeight: 1 }}>$165.00</span>
        </div>
      </div>
      <div className="mt-5 rounded-full py-2.5 text-center text-sm font-semibold" style={{ background: '#dcfce7', color: '#16a34a' }}>
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
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="grid grid-cols-5 gap-2">
        {days.map((d) => (
          <div key={d} className="pb-1.5 text-center text-xs font-semibold text-muted-foreground">{d}</div>
        ))}
        {row1.map((b, i) =>
          b ? (
            <div key={`r1-${i}`} className={`rounded p-1.5 text-[10px] leading-tight ${b.accent ? 'bg-primary/15 font-semibold text-primary' : 'bg-muted text-muted-foreground'}`}>
              {b.label}
            </div>
          ) : <div key={`r1-${i}`} />
        )}
        {row2.map((b, i) =>
          b ? (
            <div key={`r2-${i}`} className="rounded bg-muted p-1.5 text-[10px] leading-tight text-muted-foreground">{b.label}</div>
          ) : <div key={`r2-${i}`} />
        )}
      </div>
    </div>
  )
}

function RemindersVisual() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="max-w-[90%] rounded-xl rounded-tl-none bg-muted p-3.5">
        <p className="text-xs font-semibold text-foreground mb-1">Jobigram</p>
        <p className="text-sm text-muted-foreground">
          Hi Alex — your appointment is confirmed for tomorrow at 2 pm. Reply STOP to unsubscribe.
        </p>
      </div>
      <div className="ml-auto max-w-[75%] rounded-xl rounded-tr-none bg-primary/10 p-3.5">
        <p className="text-sm text-primary">Got it, thanks!</p>
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
        <div key={row.name} className="flex items-center justify-between px-5 py-3.5">
          <div>
            <p className="text-base font-medium text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.detail}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
  title: string
  icon: 'document' | 'check' | 'calendar' | 'bell' | 'person'
  Visual: () => React.ReactElement
}

const EVENTS: EventItem[] = [
  { id: 'estimate-sent',    title: 'Estimate sent',      icon: 'document',  Visual: EstimatesVisual },
  { id: 'customer-approves',title: 'Customer approves',  icon: 'check',     Visual: ApprovedEstimateVisual },
  { id: 'job-scheduled',    title: 'Job scheduled',      icon: 'calendar',  Visual: SchedulingVisual },
  { id: 'reminder-sent',    title: 'Reminder sent',      icon: 'bell',      Visual: RemindersVisual },
  { id: 'history-saved',    title: 'History saved',      icon: 'person',    Visual: CustomersVisual },
]

// ── Icons ─────────────────────────────────────────────────────────────────

function EventIcon({ icon, size = 28, color }: { icon: EventItem['icon']; size?: number; color: string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (icon === 'document') return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  if (icon === 'check')    return <svg {...p} strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
  if (icon === 'calendar') return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  if (icon === 'bell')     return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

function SmallCheck({ color }: { color: string }) {
  return (
    <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Layout constants ──────────────────────────────────────────────────────

const CARD_WIDTH    = 480
const CARD_AREA_H   = 260  // px; tall enough for the deepest card + pointer
const CONNECTOR_W   = 6    // px gap between buttons

// ── Main component ──────────────────────────────────────────────────────

export default function FeatureTabs() {
  const [selected, setSelected]   = useState(0)
  const [animKey, setAnimKey]     = useState(0)
  const [containerW, setContainerW] = useState(840)
  const [hovered, setHovered]     = useState<number | null>(null)
  const [prefersRM, setPrefersRM] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [stopped, setStopped]     = useState(false)
  const [progressKey, setProgressKey] = useState(0)
  const [cardAreaH, setCardAreaH]     = useState(260)

  const sectionRef = useRef<HTMLDivElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const btnRefs    = useRef<(HTMLButtonElement | null)[]>([])
  const blurTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersRM(mq.matches)
    const h = () => setPrefersRM(mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    function measure() {
      const el = measureRef.current
      if (!el) return
      const heights = Array.from(el.children).map((c) => (c as HTMLElement).offsetHeight)
      const max = Math.max(...heights)
      if (max > 0) setCardAreaH(max)
    }
    document.fonts.ready.then(measure)
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.intersectionRatio >= 0.4),
      { threshold: [0, 0.4] },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Reset progress bar to 0% when section re-enters view
  const prevVisible = useRef(false)
  useEffect(() => {
    if (isVisible && !prevVisible.current) setProgressKey((k) => k + 1)
    prevVisible.current = isVisible
  }, [isVisible])

  const autoRunning = isVisible && !isHovering && !isFocused && !stopped && !prefersRM

  useEffect(() => {
    if (!autoRunning) return
    const id = setInterval(() => {
      setSelected((prev) => (prev + 1) % EVENTS.length)
      setAnimKey((k) => k + 1)
      setProgressKey((k) => k + 1)
    }, 4000)
    return () => clearInterval(id)
  }, [autoRunning])

  function handleFocusCapture() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setIsFocused(true)
  }
  function handleBlurCapture() {
    blurTimer.current = setTimeout(() => setIsFocused(false), 0)
  }

  function pick(i: number) {
    setStopped(true)
    setSelected(i)
    setAnimKey((k) => k + 1)
  }

  function handleKey(e: React.KeyboardEvent, i: number) {
    if (e.key === 'ArrowRight') { const n = (i + 1) % EVENTS.length; btnRefs.current[n]?.focus(); pick(n) }
    else if (e.key === 'ArrowLeft') { const n = (i - 1 + EVENTS.length) % EVENTS.length; btnRefs.current[n]?.focus(); pick(n) }
    else if (e.key === 'Home') { btnRefs.current[0]?.focus(); pick(0) }
    else if (e.key === 'End')  { const l = EVENTS.length - 1; btnRefs.current[l]?.focus(); pick(l) }
  }

  const tr = (ms: number) => prefersRM ? 'none' : `all ${ms}ms ease`

  // Center x of button i within the container
  function btnCenter(i: number): number {
    const B = (containerW - (EVENTS.length - 1) * CONNECTOR_W) / EVENTS.length
    return i * (B + CONNECTOR_W) + B / 2
  }

  function cardLeft(i: number): number {
    return Math.max(0, Math.min(containerW - CARD_WIDTH, btnCenter(i) - CARD_WIDTH / 2))
  }

  function pointerOff(i: number): number {
    return btnCenter(i) - cardLeft(i)
  }

  const { Visual } = EVENTS[selected]

  return (
    <div
      ref={sectionRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <style>{`
        @keyframes day-card-enter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      {/* ── DESKTOP ── */}
      <div ref={wrapRef} className="hidden sm:block">

        {/* Hidden rack: measure all card heights so we can reserve the tallest */}
        <div
          ref={measureRef}
          aria-hidden="true"
          style={{ position: 'absolute', visibility: 'hidden', left: -9999, top: 0, width: CARD_WIDTH, pointerEvents: 'none' }}
        >
          {EVENTS.map((ev) => <div key={ev.id}><ev.Visual /></div>)}
        </div>

        {/* Fixed-height card area; cards hang from the bottom */}
        <div aria-live="off" style={{ position: 'relative', height: cardAreaH, overflow: 'visible' }}>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: cardLeft(selected),
              width: CARD_WIDTH,
              transition: tr(300),
            }}
          >
            <div
              key={animKey}
              className="relative z-10"
              style={{ minHeight: cardAreaH, ...(prefersRM ? {} : { animation: 'day-card-enter 250ms ease-out', animationFillMode: 'both' }) }}
            >
              <Visual />
            </div>
            {/* Diamond pointer */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: -8,
                left: pointerOff(selected),
                transform: 'translateX(-50%) rotate(45deg)',
                width: 12, height: 12,
                background: '#ffffff',
                borderRight: '1.5px solid #DDD9CE',
                borderBottom: '1.5px solid #DDD9CE',
                zIndex: 9,
                transition: tr(300),
              }}
            />
          </div>
        </div>

        {/* Button timeline row */}
        <div
          role="tablist"
          aria-label="A day with Jobigram"
          style={{ display: 'flex', alignItems: 'stretch', marginTop: 16 }}
        >
          {EVENTS.map((ev, i) => {
            const isActive = i === selected
            const isDone   = i < selected
            const isHov    = hovered === i && !isActive

            const bg     = isActive ? '#2457F5' : isDone ? 'rgba(36,87,245,0.07)' : '#ffffff'
            const border = isActive ? '#2457F5' : isHov ? '#2457F5' : isDone ? 'rgba(36,87,245,0.25)' : '#DDD9CE'
            const iconColor = isActive ? '#ffffff' : isDone ? '#2457F5' : '#5B6068'
            const textColor = isActive ? '#ffffff' : '#14161B'

            return (
              <React.Fragment key={ev.id}>
                {/* Connector between buttons */}
                {i > 0 && (
                  <div
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      alignSelf: 'center',
                      width: CONNECTOR_W,
                      height: 2,
                      background: i <= selected ? '#2457F5' : '#DDD9CE',
                      transition: tr(300),
                    }}
                  />
                )}

                <button
                  ref={(el) => { btnRefs.current[i] = el }}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => pick(i)}
                  onKeyDown={(e) => handleKey(e, i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    flex: 1,
                    height: 88,
                    borderRadius: 16,
                    border: `1px solid ${border}`,
                    background: bg,
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '0 8px',
                    transform: isActive && !prefersRM ? 'translateY(-2px) scale(1.03)' : 'none',
                    transition: tr(200),
                    outline: 'none',
                  }}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {/* Done check badge */}
                  {isDone && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 8, right: 8,
                        width: 16, height: 16,
                        borderRadius: '50%',
                        background: 'rgba(36,87,245,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <SmallCheck color="#2457F5" />
                    </div>
                  )}

                  <EventIcon icon={ev.icon} size={28} color={iconColor} />

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: textColor,
                      lineHeight: 1.2,
                      textAlign: 'center',
                      fontFamily: 'var(--font-display), sans-serif',
                      transition: tr(200),
                    }}
                  >
                    {ev.title}
                  </span>

                  {/* Progress bar track (always rendered on active so it fades with button) */}
                  {isActive && !prefersRM && (
                    <div
                      aria-hidden="true"
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: '0 0 15px 15px', overflow: 'hidden', background: 'rgba(255,255,255,0.2)' }}
                    >
                      <div
                        key={progressKey}
                        style={{ height: '100%', background: 'rgba(255,255,255,0.8)', animationName: 'progress-fill', animationDuration: '4s', animationTimingFunction: 'linear', animationFillMode: 'both', animationPlayState: autoRunning ? 'running' : 'paused' }}
                      />
                    </div>
                  )}
                </button>
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ── MOBILE accordion ── */}
      <div className="sm:hidden" aria-live="off">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EVENTS.map((ev, i) => {
            const isActive = i === selected
            const isDone   = i < selected
            const iconColor = isActive ? '#ffffff' : isDone ? '#2457F5' : '#5B6068'
            const bg = isActive ? '#2457F5' : isDone ? 'rgba(36,87,245,0.07)' : '#ffffff'
            const border = isActive ? '#2457F5' : isDone ? 'rgba(36,87,245,0.25)' : '#DDD9CE'

            return (
              <div key={ev.id}>
                <button
                  ref={(el) => { if (!btnRefs.current[i]) btnRefs.current[i] = el }}
                  role="tab"
                  aria-selected={isActive}
                  aria-expanded={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => pick(i)}
                  onKeyDown={(e) => handleKey(e, i)}
                  style={{
                    width: '100%',
                    height: 72,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '0 18px',
                    borderRadius: 14,
                    border: `1px solid ${border}`,
                    background: bg,
                    cursor: 'pointer',
                    position: 'relative',
                    outline: 'none',
                  }}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <EventIcon icon={ev.icon} size={24} color={iconColor} />
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      fontSize: 15,
                      fontWeight: 600,
                      color: isActive ? '#ffffff' : '#14161B',
                      fontFamily: 'var(--font-display), sans-serif',
                    }}
                  >
                    {ev.title}
                  </span>
                  {isDone && !isActive && (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(36,87,245,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <SmallCheck color="#2457F5" />
                    </div>
                  )}
                </button>

                {/* Accordion card – always mounted for smooth height transition */}
                <div
                  style={{
                    maxHeight: isActive ? 600 : 0,
                    opacity: isActive ? 1 : 0,
                    overflow: 'hidden',
                    marginTop: isActive ? 8 : 0,
                    transition: prefersRM ? 'none' : 'max-height 350ms ease, opacity 250ms ease, margin-top 350ms ease',
                  }}
                >
                  <ev.Visual />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
