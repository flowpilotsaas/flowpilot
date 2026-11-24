'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { Range, SummaryResponse, PeriodMetrics } from '@/app/api/reports/summary/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const NUM = new Intl.NumberFormat('en-US')
const PCT = (n: number) => `${n.toFixed(1)}%`

function fmt(value: number, format: 'usd' | 'num' | 'pct') {
  if (format === 'usd') return USD.format(value)
  if (format === 'pct') return PCT(value)
  return NUM.format(value)
}

function delta(curr: number, prev: number, lowerIsBetter = false) {
  if (prev === 0) return null
  const pct = ((curr - prev) / prev) * 100
  const up = lowerIsBetter ? pct < 0 : pct > 0
  return { pct, up }
}

const RANGE_OPTS: { value: Range; label: string }[] = [
  { value: '7d',   label: 'Last 7 days' },
  { value: '30d',  label: 'Last 30 days' },
  { value: 'month',label: 'This month' },
  { value: 'year', label: 'This year' },
]

const STATUS_ORDER = ['Scheduled', 'In Progress', 'Completed', 'Paid'] as const
const STATUS_COLOR: Record<string, string> = {
  Scheduled:   'bg-blue-500',
  'In Progress':'bg-amber-500',
  Completed:   'bg-emerald-500',
  Paid:        'bg-primary',
}

// ─── Animated counter hook ────────────────────────────────────────────────────

function useAnimatedValue(target: number, enabled: boolean) {
  const [display, setDisplay] = React.useState(target)
  const prevRef = React.useRef(target)
  const rafRef  = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!enabled) { setDisplay(target); prevRef.current = target; return }
    const from = prevRef.current
    prevRef.current = target
    if (from === target) return

    const start = performance.now()
    const dur = 500

    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(from + (target - from) * ease)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, enabled])

  return display
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RangeSwitcher({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])

  function onKey(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'ArrowRight') { e.preventDefault(); refs.current[(idx + 1) % RANGE_OPTS.length]?.focus() }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); refs.current[(idx - 1 + RANGE_OPTS.length) % RANGE_OPTS.length]?.focus() }
  }

  return (
    <div role="group" aria-label="Date range" className="inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5 gap-0.5">
      {RANGE_OPTS.map(({ value: v, label }, i) => (
        <button
          key={v}
          ref={(el) => { refs.current[i] = el }}
          type="button"
          role="radio"
          aria-checked={v === value}
          onClick={() => onChange(v)}
          onKeyDown={(e) => onKey(e, i)}
          tabIndex={v === value ? 0 : -1}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 cursor-pointer',
            v === value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

type TileProps = {
  label: string
  value: number
  format: 'usd' | 'num' | 'pct'
  prev: number | null
  lowerIsBetter?: boolean
  loading: boolean
  skeleton: boolean
}

function MetricTile({ label, value, format, prev, lowerIsBetter, loading, skeleton }: TileProps) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const animated = useAnimatedValue(value, !reduced)
  const d = prev !== null ? delta(value, prev, lowerIsBetter) : null

  if (skeleton) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 h-[112px]">
        <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 flex flex-col gap-1 h-[112px] transition-opacity', loading && 'opacity-50')}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums font-display leading-tight">
        {fmt(format === 'pct' ? animated : Math.round(animated), format)}
      </p>
      {d !== null ? (
        <p className={cn('text-xs font-medium flex items-center gap-0.5', d.up ? 'text-success' : 'text-destructive')}>
          {d.up ? '↑' : '↓'} {Math.abs(d.pct).toFixed(1)}% vs prev period
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/50">No prior data</p>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [range, setRange]       = React.useState<Range>('30d')
  const [data, setData]         = React.useState<SummaryResponse | null>(null)
  const [skeleton, setSkeleton] = React.useState(true)
  const [loading, setLoading]   = React.useState(false)
  const [error, setError]       = React.useState<string | null>(null)

  const fetchData = React.useCallback(async (r: Range, isFirst: boolean) => {
    if (!isFirst) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/summary?range=${r}`)
      if (!res.ok) throw new Error(await res.text())
      const json: SummaryResponse = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setSkeleton(false)
    }
  }, [])

  React.useEffect(() => { fetchData(range, true) }, [])

  function handleRangeChange(r: Range) {
    setRange(r)
    fetchData(r, false)
  }

  const cur = data?.current
  const prev = data?.previous

  function tile(label: string, curVal: number, prevVal: number, format: 'usd' | 'num' | 'pct', lowerIsBetter = false) {
    return (
      <MetricTile
        label={label}
        value={curVal}
        format={format}
        prev={prev ? prevVal : null}
        lowerIsBetter={lowerIsBetter}
        loading={loading}
        skeleton={skeleton}
      />
    )
  }

  const approvalRate = cur && cur.estSent > 0 ? (cur.estApproved / cur.estSent) * 100 : 0
  const prevApprovalRate = prev && prev.estSent > 0 ? (prev.estApproved / prev.estSent) * 100 : 0

  // Sort jobs by status for the status list
  const statusEntries: { status: string; count: number }[] = cur
    ? [
        ...STATUS_ORDER
          .map((s) => ({ status: s as string, count: cur.jobsByStatus[s] ?? 0 }))
          .filter((e) => e.count > 0),
        ...Object.entries(cur.jobsByStatus)
          .filter(([s]) => !STATUS_ORDER.includes(s as typeof STATUS_ORDER[number]))
          .map(([s, c]) => ({ status: s, count: c })),
      ]
    : []

  const totalJobsInPeriod = statusEntries.reduce((s, e) => s + e.count, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">How your business is doing</p>
        </div>
        <RangeSwitcher value={range} onChange={handleRangeChange} />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3 text-sm text-destructive">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => fetchData(range, false)}
            className="text-xs font-medium underline underline-offset-2 cursor-pointer hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric tiles */}
      {!error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {skeleton ? (
            Array.from({ length: 8 }).map((_, i) => (
              <MetricTile key={i} label="" value={0} format="num" prev={null} loading={false} skeleton={true} />
            ))
          ) : cur ? (
            <>
              {tile('Revenue Collected', cur.revenue, prev?.revenue ?? 0, 'usd')}
              {tile('Outstanding', cur.outstandingTotal, prev?.outstandingTotal ?? 0, 'usd', true)}
              {tile('Estimates Sent', cur.estSent, prev?.estSent ?? 0, 'num')}
              {tile('Approval Rate', approvalRate, prevApprovalRate, 'pct')}
              {tile('Jobs Completed', cur.jobsCompleted, prev?.jobsCompleted ?? 0, 'num')}
              {tile('New Customers', cur.newCustomers, prev?.newCustomers ?? 0, 'num')}
              {tile('Outstanding (count)', cur.outstandingCount, prev?.outstandingCount ?? 0, 'num', true)}
              {tile('Est. Approved', cur.estApproved, prev?.estApproved ?? 0, 'num')}
            </>
          ) : null}
        </div>
      )}

      {/* Empty state */}
      {!skeleton && !error && cur && totalJobsInPeriod === 0 &&
       cur.revenue === 0 && cur.newCustomers === 0 && cur.estSent === 0 && (
        <div className="rounded-xl border border-border bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No data for this period yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create some jobs, estimates or record a payment to get started.</p>
        </div>
      )}

      {/* Jobs by status */}
      {!skeleton && !error && statusEntries.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Jobs by Status</h2>
          <div className={cn('space-y-2 transition-opacity', loading && 'opacity-50')}>
            {statusEntries.map(({ status, count }) => {
              const pct = totalJobsInPeriod > 0 ? (count / totalJobsInPeriod) * 100 : 0
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_COLOR[status] ?? 'bg-muted-foreground')} />
                    <span className="text-sm text-foreground">{status}</span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', STATUS_COLOR[status] ?? 'bg-muted-foreground')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm tabular-nums text-muted-foreground w-6 text-right shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
