'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Mail } from 'lucide-react'
import { ONLINE_PAYMENTS_LIVE } from '@/lib/site-config'

type Step = 'notification' | 'estimate' | 'approved' | 'declined'

const BUSINESS = 'Cooper Heating & Air'
const EST_ID = 'E-0042'
const JOB_DATE = 'Thu, Aug 7'

const ITEMS = [
  { name: 'Annual tune-up', qty: 1, price: 350 },
  { name: 'Filter replacement', qty: 2, price: 45 },
  { name: 'Thermostat calibration', qty: 1, price: 310 },
]

const TOTAL = ITEMS.reduce((s, i) => s + i.qty * i.price, 0)

function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default function HeroDemo() {
  const [step, setStep] = useState<Step>('notification')
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const dur = reduced ? '0ms' : '220ms'

  return (
    <div className="flex flex-col items-center select-none">

      {/* Phone frame */}
      <div
        aria-label="Interactive estimate demo"
        style={{
          width: 260,
          height: 500,
          borderRadius: '2.5rem',
          border: '6px solid oklch(0.18 0.01 270 / 0.14)',
          boxShadow: '0 24px 64px oklch(0 0 0 / 0.10), 0 4px 16px oklch(0 0 0 / 0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}
        className="bg-card"
      >
        {/* Top pill (notch) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 84,
            height: 18,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            zIndex: 20,
          }}
          className="bg-foreground/[0.07]"
        />

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-[22px] pb-1">
          <span className="text-[11px] font-semibold tabular-nums text-foreground/40">9:41</span>
          <div className="flex items-center gap-1.5">
            <div className="h-[5px] w-3.5 rounded-full bg-foreground/20" />
            <div className="h-2 w-2 rounded-full bg-foreground/20" />
          </div>
        </div>

        {/* Screen */}
        <div className="px-4 pt-2 pb-3" style={{ height: 'calc(100% - 46px)', overflow: 'hidden' }}>

          {/* Accessible status announcements */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {step === 'estimate' && `Estimate from ${BUSINESS} opened. Total ${fmt(TOTAL)}.`}
            {step === 'approved' && `Estimate approved. Job added for ${JOB_DATE}. Reminder scheduled.`}
            {step === 'declined' && 'Estimate declined.'}
          </div>

          {/* ── NOTIFICATION ── */}
          {step === 'notification' && (
            <div style={{ transition: `opacity ${dur}` }}>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notifications
              </p>
              <button
                type="button"
                onClick={() => setStep('estimate')}
                className="w-full text-left rounded-2xl border border-border bg-muted/60 p-3.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`View estimate from ${BUSINESS} for ${fmt(TOTAL)}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold leading-tight text-foreground">{BUSINESS}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Estimate ready — {fmt(TOTAL)}
                    </p>
                    <span className="mt-2 inline-block text-[11px] font-semibold text-primary">
                      View estimate →
                    </span>
                  </div>
                </div>
              </button>
              <p className="demo-pulse mt-4 text-center text-[11px] text-muted-foreground">
                Tap to try it
              </p>
            </div>
          )}

          {/* ── ESTIMATE ── */}
          {step === 'estimate' && (
            <div style={{ transition: `opacity ${dur}` }}>
              <button
                type="button"
                onClick={() => setStep('notification')}
                className="mb-3 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                ← Back
              </button>
              <p className="text-[13px] font-bold text-foreground leading-tight">{BUSINESS}</p>
              <p className="text-[11px] text-muted-foreground">#{EST_ID}</p>

              <div className="mt-3 space-y-1.5">
                {ITEMS.map((item) => (
                  <div key={item.name} className="flex justify-between text-[12px]">
                    <span className="text-muted-foreground truncate max-w-[138px]">
                      {item.qty > 1 ? `${item.name} ×${item.qty}` : item.name}
                    </span>
                    <span className="ml-2 font-medium tabular-nums text-foreground">
                      {fmt(item.qty * item.price)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-border">
                  <span className="text-[12px] font-semibold text-foreground">Total</span>
                  <span className="text-[15px] font-bold tabular-nums text-foreground">{fmt(TOTAL)}</span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('approved')}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setStep('declined')}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border text-foreground text-[12px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* ── APPROVED ── */}
          {step === 'approved' && (
            <div style={{ transition: `opacity ${dur}` }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">Approved!</p>
                  <p className="text-[11px] text-muted-foreground">#{EST_ID}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-3 mb-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Job added
                </p>
                <p className="text-[12px] font-semibold text-foreground">{BUSINESS}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{JOB_DATE} · Scheduled</p>
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-primary" />
                  <span className="text-[11px] text-muted-foreground">Reminder scheduled</span>
                </div>
              </div>

              {ONLINE_PAYMENTS_LIVE && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 mb-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[12px] font-semibold text-emerald-800 dark:text-emerald-300">
                      Payment received
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {fmt(TOTAL)} via card
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('notification')}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <RotateCcw className="h-3 w-3" />
                Replay
              </button>
            </div>
          )}

          {/* ── DECLINED ── */}
          {step === 'declined' && (
            <div style={{ transition: `opacity ${dur}` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-[13px] font-semibold text-foreground">Noted, thank you.</p>
              </div>
              <p className="text-[12px] leading-relaxed text-muted-foreground mb-4">
                We&apos;ll let the team know. Feel free to reach out if you&apos;d like to discuss further.
              </p>
              <button
                type="button"
                onClick={() => setStep('notification')}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <RotateCcw className="h-3 w-3" />
                Replay
              </button>
            </div>
          )}

        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground/50">
        Sample data · Not a real estimate
      </p>

    </div>
  )
}
