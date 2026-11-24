'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { Range, SummaryResponse } from '@/app/api/reports/summary/route'

// ─── Formatting ───────────────────────────────────────────────────────────────

const USD_FULL = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const NUM = new Intl.NumberFormat('en-US')
const PCT = (n: number) => `${n.toFixed(1)}%`

function fmt(value: number, format: 'usd' | 'num' | 'pct') {
  if (format === 'usd') return USD_FULL.format(value)
  if (format === 'pct') return PCT(value)
  return NUM.format(value)
}

function fmtShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

function delta(curr: number, prev: number, lowerIsBetter = false) {
  if (prev === 0) return null
  const pct = ((curr - prev) / prev) * 100
  const up = lowerIsBetter ? pct < 0 : pct > 0
  return { pct, up }
}

const RANGE_OPTS: { value: Range; label: string }[] = [
  { value: '7d',    label: 'Last 7 days' },
  { value: '30d',   label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'year',  label: 'This year' },
]

const STATUS_ORDER = ['Scheduled', 'In Progress', 'Completed', 'Paid'] as const
const STATUS_COLORS: Record<string, string> = {
  Scheduled:    '#3b82f6',
  'In Progress':'#f59e0b',
  Completed:    '#10b981',
  Paid:         'var(--primary)',
}

function useReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ─── Animated value (for tiles) ───────────────────────────────────────────────

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
    function tick(now: number) {
      const t = Math.min((now - start) / 500, 1)
      setDisplay(from + (target - from) * (1 - (1 - t) ** 3))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, enabled])

  return display
}

// ─── Animated series (for charts) ────────────────────────────────────────────

function useAnimatedSeries(target: number[], enabled: boolean) {
  const [display, setDisplay] = React.useState<number[]>(target)
  const prevRef = React.useRef<number[]>(target)
  const rafRef  = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    if (!enabled || prevRef.current.length !== target.length) {
      setDisplay(target)
      prevRef.current = [...target]
      return
    }

    const from = [...prevRef.current]
    prevRef.current = [...target]
    const start = performance.now()

    function tick(now: number) {
      const t = Math.min((now - start) / 500, 1)
      const ease = 1 - (1 - t) ** 3
      setDisplay(from.map((f, i) => f + (target[i] - f) * ease))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return display
}

// ─── RangeSwitcher ────────────────────────────────────────────────────────────

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
          type="button" role="radio" aria-checked={v === value}
          onClick={() => onChange(v)}
          onKeyDown={(e) => onKey(e, i)}
          tabIndex={v === value ? 0 : -1}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 cursor-pointer',
            v === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >{label}</button>
      ))}
    </div>
  )
}

// ─── MetricTile ───────────────────────────────────────────────────────────────

type TileProps = {
  label: string; value: number; format: 'usd' | 'num' | 'pct'
  prev: number | null; lowerIsBetter?: boolean; neutralDelta?: boolean
  loading: boolean; skeleton: boolean
}

function MetricTile({ label, value, format, prev, lowerIsBetter, neutralDelta, loading, skeleton }: TileProps) {
  const reduced = useReducedMotion()
  const animated = useAnimatedValue(value, !reduced)
  const d = prev !== null ? delta(value, prev, lowerIsBetter) : null

  if (skeleton) return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 h-[112px]">
      <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
      <div className="h-8 w-32 rounded bg-muted animate-pulse" />
      <div className="h-3 w-16 rounded bg-muted animate-pulse" />
    </div>
  )

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 flex flex-col gap-1 h-[112px] transition-opacity', loading && 'opacity-50')}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums font-display leading-tight">
        {fmt(format === 'pct' ? animated : Math.round(animated), format)}
      </p>
      {d !== null ? (
        <p className={cn('text-xs font-medium flex items-center gap-0.5',
          neutralDelta ? 'text-muted-foreground' : d.up ? 'text-success' : 'text-destructive')}>
          {d.pct > 0 ? '↑' : d.pct < 0 ? '↓' : '—'} {Math.abs(d.pct).toFixed(1)}% vs prev period
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/50">No prior data</p>
      )}
    </div>
  )
}

// ─── RevenueChart ─────────────────────────────────────────────────────────────

type RevPoint = { label: string; value: number }

const CHART_H = 160
const PAD = { top: 16, right: 12, bottom: 28, left: 52 }

function buildPath(values: number[], xs: number[], yScale: (v: number) => number): string {
  if (values.length === 0) return ''
  if (values.length === 1) return `M ${xs[0]},${yScale(values[0])}`
  let d = `M ${xs[0]},${yScale(values[0])}`
  for (let i = 0; i < values.length - 1; i++) {
    const x0 = xs[i], y0 = yScale(values[i])
    const x1 = xs[i + 1], y1 = yScale(values[i + 1])
    const mx = (x0 + x1) / 2
    d += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`
  }
  return d
}

function RevenueChart({ series, loading }: { series: RevPoint[]; loading: boolean }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const lineRef      = React.useRef<SVGPathElement>(null)
  const [width, setWidth]   = React.useState(0)
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null)
  const drawnIn = React.useRef(false)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const values = series.map((p) => p.value)
  const display = useAnimatedSeries(values, !reduced && width > 0)

  const plotW = Math.max(width - PAD.left - PAD.right, 1)
  const plotH = CHART_H - PAD.top - PAD.bottom
  const maxV  = Math.max(...values, 1)

  const xs = display.map((_, i) =>
    display.length > 1 ? PAD.left + (i / (display.length - 1)) * plotW : PAD.left + plotW / 2
  )
  const yScale = (v: number) => PAD.top + plotH - (v / maxV) * plotH

  const linePath = buildPath(display, xs, yScale)
  const areaPath = linePath
    ? `${linePath} L ${xs[xs.length - 1]},${PAD.top + plotH} L ${xs[0]},${PAD.top + plotH} Z`
    : ''

  // Draw-in on first real data
  React.useEffect(() => {
    if (reduced || drawnIn.current || !lineRef.current || values.every(v => v === 0)) return
    if (values.length === 0) return
    drawnIn.current = true
    const el = lineRef.current
    const len = el.getTotalLength()
    if (len === 0) return
    el.style.strokeDasharray = String(len)
    el.style.strokeDashoffset = String(len)
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / 700, 1)
      el.style.strokeDashoffset = String(len * (1 - (1 - (1 - t) ** 3)))
      if (t < 1) requestAnimationFrame(tick)
      else { el.style.strokeDasharray = el.style.strokeDashoffset = '' }
    }
    requestAnimationFrame(tick)
  }, [values.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Grid values
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.top + plotH - f * plotH,
    label: fmtShort(f * maxV),
  }))

  // X-axis label skip: show every Nth
  const xSkip = display.length <= 7 ? 1 : display.length <= 14 ? 2 : display.length <= 31 ? 7 : 1

  // Tooltip data
  const tooltipPoint = hoverIdx !== null ? series[hoverIdx] : null

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!containerRef.current || display.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const idx = display.length === 1
      ? 0
      : Math.max(0, Math.min(display.length - 1, Math.round((mx - PAD.left) / (plotW / (display.length - 1)))))
    setHoverIdx(idx)
  }

  const hasData = values.some(v => v > 0)

  return (
    <div ref={containerRef} className="relative">
      {!hasData ? (
        <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
          No revenue in this period
        </div>
      ) : (
        <>
          {/* Visually hidden table for screen readers */}
          <table className="sr-only">
            <caption>Revenue over time</caption>
            <thead><tr><th>Date</th><th>Revenue</th></tr></thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.label}><td>{p.label}</td><td>{USD_FULL.format(p.value)}</td></tr>
              ))}
            </tbody>
          </table>

          <svg
            width={width || undefined}
            height={CHART_H}
            aria-hidden="true"
            className={cn('overflow-visible transition-opacity', loading && 'opacity-50')}
            onMouseMove={handleSvgMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Gridlines */}
            {gridTicks.map(({ y, label }, i) => (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y}
                  stroke="var(--border)" strokeWidth={1} />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                  fontSize={10} fill="var(--muted-foreground)">{label}</text>
              </g>
            ))}

            {/* Area fill */}
            {areaPath && (
              <path d={areaPath} fill="var(--primary)" fillOpacity={0.12} stroke="none" />
            )}

            {/* Line */}
            {linePath && (
              <path ref={lineRef} d={linePath}
                fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* X-axis labels */}
            {series.map((p, i) => (
              i % xSkip === 0 && (
                <text key={i} x={xs[i]} y={CHART_H - 4} textAnchor="middle"
                  fontSize={10} fill="var(--muted-foreground)">{p.label}</text>
              )
            ))}

            {/* Hover dot + vertical line */}
            {hoverIdx !== null && xs[hoverIdx] != null && (
              <>
                <line x1={xs[hoverIdx]} y1={PAD.top} x2={xs[hoverIdx]} y2={PAD.top + plotH}
                  stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={xs[hoverIdx]} cy={yScale(display[hoverIdx])} r={4}
                  fill="var(--primary)" stroke="var(--background)" strokeWidth={2} />
              </>
            )}

            {/* Focusable dots for keyboard */}
            {series.map((p, i) => (
              <circle key={i} cx={xs[i]} cy={yScale(display[i] ?? 0)} r={8}
                fill="transparent" tabIndex={0} role="img"
                aria-label={`${p.label}: ${USD_FULL.format(p.value)}`}
                className="outline-none focus-visible:fill-primary/20"
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)} />
            ))}
          </svg>

          {/* Tooltip */}
          {tooltipPoint !== null && hoverIdx !== null && xs[hoverIdx] != null && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs"
              style={{
                left: Math.min(xs[hoverIdx] + 8, width - 110),
                top: Math.max(PAD.top, yScale(display[hoverIdx] ?? 0) - 36),
              }}
            >
              <p className="font-medium text-foreground">{USD_FULL.format(tooltipPoint.value)}</p>
              <p className="text-muted-foreground">{tooltipPoint.label}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── EstimatesFunnel ──────────────────────────────────────────────────────────

type FunnelData = { sent: number; approved: number; declined: number; pending: number }

function FunnelBar({
  label, count, total, color, loading, reduced,
}: { label: string; count: number; total: number; color: string; loading: boolean; reduced: boolean }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const animated = useAnimatedValue(pct, !reduced)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">
          {count} {total > 0 && <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-opacity', loading && 'opacity-50')}
          style={{ width: `${animated}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function EstimatesFunnel({ funnel, loading }: { funnel: FunnelData; loading: boolean }) {
  const reduced = useReducedMotion()
  const sent = funnel.sent

  if (sent === 0) return (
    <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
      No estimates in this period
    </div>
  )

  return (
    <div className="space-y-3" aria-label="Estimates funnel">
      <p className="sr-only">
        Out of {sent} estimates sent: {funnel.approved} approved, {funnel.pending} pending, {funnel.declined} declined.
      </p>
      <FunnelBar label="Sent"     count={sent}            total={sent} color="var(--primary)"     loading={loading} reduced={reduced} />
      <FunnelBar label="Approved" count={funnel.approved} total={sent} color="var(--success)"     loading={loading} reduced={reduced} />
      <FunnelBar label="Pending"  count={funnel.pending}  total={sent} color="var(--muted-foreground)" loading={loading} reduced={reduced} />
      <FunnelBar label="Declined" count={funnel.declined} total={sent} color="var(--destructive)"  loading={loading} reduced={reduced} />
    </div>
  )
}

// ─── JobsStackedBar ───────────────────────────────────────────────────────────

function JobsStackedBar({ jobsByStatus, loading }: { jobsByStatus: Record<string, number>; loading: boolean }) {
  const reduced = useReducedMotion()
  const entries: { status: string; count: number; color: string }[] = [
    ...STATUS_ORDER
      .map((s) => ({ status: s as string, count: jobsByStatus[s] ?? 0, color: STATUS_COLORS[s] ?? '#94a3b8' }))
      .filter((e) => e.count > 0),
    ...Object.entries(jobsByStatus)
      .filter(([s]) => !STATUS_ORDER.includes(s as typeof STATUS_ORDER[number]))
      .map(([s, c]) => ({ status: s, count: c, color: '#94a3b8' })),
  ]
  const total = entries.reduce((s, e) => s + e.count, 0)

  if (total === 0) return (
    <p className="text-sm text-muted-foreground">No jobs in this period</p>
  )

  return (
    <div className={cn('space-y-3 transition-opacity', loading && 'opacity-50')} aria-label="Jobs by status">
      <p className="sr-only">{entries.map(e => `${e.status}: ${e.count}`).join(', ')}</p>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px" aria-hidden="true">
        {entries.map(({ status, count, color }) => {
          const pct = (count / total) * 100
          const anim = useAnimatedValue(pct, !reduced) // eslint-disable-line react-hooks/rules-of-hooks
          return (
            <div key={status} style={{ width: `${anim}%`, backgroundColor: color }} className="h-full transition-all" />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(({ status, count, color }) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span>{status}</span>
            <span className="font-medium tabular-nums text-foreground">{count}</span>
          </div>
        ))}
      </div>
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
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setSkeleton(false)
    }
  }, [])

  React.useEffect(() => { fetchData(range, true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRangeChange(r: Range) {
    setRange(r)
    fetchData(r, false)
  }

  const cur  = data?.current
  const prev = data?.previous

  function tile(label: string, curVal: number, prevVal: number, format: 'usd' | 'num' | 'pct', lowerIsBetter = false, neutralDelta = false) {
    return (
      <MetricTile label={label} value={curVal} format={format}
        prev={prev ? prevVal : null} lowerIsBetter={lowerIsBetter} neutralDelta={neutralDelta}
        loading={loading} skeleton={skeleton} />
    )
  }

  const approvalRate     = cur && cur.estSent > 0 ? (cur.estApproved / cur.estSent) * 100 : 0
  const prevApprovalRate = prev && prev.estSent > 0 ? (prev.estApproved / prev.estSent) * 100 : 0

  const statusEntries: { status: string; count: number }[] = cur
    ? [
        ...STATUS_ORDER.map((s) => ({ status: s as string, count: cur.jobsByStatus[s] ?? 0 })).filter(e => e.count > 0),
        ...Object.entries(cur.jobsByStatus).filter(([s]) => !STATUS_ORDER.includes(s as typeof STATUS_ORDER[number])).map(([s, c]) => ({ status: s, count: c })),
      ]
    : []

  const totalJobsInPeriod = statusEntries.reduce((s, e) => s + e.count, 0)
  const isEmpty = !skeleton && !error && cur
    && cur.revenue === 0 && cur.newCustomers === 0 && cur.estSent === 0 && totalJobsInPeriod === 0

  const funnelData: FunnelData = {
    sent:     cur?.estSent     ?? 0,
    approved: cur?.estApproved ?? 0,
    declined: cur?.estDeclined ?? 0,
    pending:  cur?.estPending  ?? 0,
  }

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

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3 text-sm text-destructive">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => fetchData(range, false)}
            className="text-xs font-medium underline underline-offset-2 cursor-pointer hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* Metric tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {skeleton ? (
              Array.from({ length: 8 }).map((_, i) => (
                <MetricTile key={i} label="" value={0} format="num" prev={null} loading={false} skeleton={true} />
              ))
            ) : cur ? (
              <>
                {tile('Revenue Collected',  cur.revenue,       prev?.revenue       ?? 0, 'usd')}
                {tile('Estimates Sent',     cur.estSent,       prev?.estSent       ?? 0, 'num')}
                {tile('Approval Rate',      approvalRate,      prevApprovalRate,         'pct')}
                {tile('Jobs Completed',     cur.jobsCompleted, prev?.jobsCompleted ?? 0, 'num')}
                {tile('New Customers',      cur.newCustomers,  prev?.newCustomers  ?? 0, 'num')}
                {tile('Est. Approved',      cur.estApproved,   prev?.estApproved   ?? 0, 'num')}
                {tile('Pending Estimates',  cur.estPending,    prev?.estPending    ?? 0, 'num', false, true)}
                {tile('Est. Declined',      cur.estDeclined,   prev?.estDeclined   ?? 0, 'num')}
              </>
            ) : null}
          </div>

          {/* Empty state */}
          {isEmpty && (
            <div className="rounded-xl border border-border bg-muted/20 px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No data for this period yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create some jobs, estimates or record a payment to get started.</p>
            </div>
          )}

          {/* Charts row */}
          {!skeleton && cur && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue chart */}
              <div className={cn('rounded-xl border border-border bg-card p-5 space-y-3 transition-opacity', loading && 'opacity-60')}>
                <h2 className="text-sm font-semibold text-foreground">Revenue</h2>
                <RevenueChart series={cur.revenueSeries} loading={loading} />
              </div>

              {/* Estimates funnel */}
              <div className={cn('rounded-xl border border-border bg-card p-5 space-y-3 transition-opacity', loading && 'opacity-60')}>
                <h2 className="text-sm font-semibold text-foreground">Estimates</h2>
                <EstimatesFunnel funnel={funnelData} loading={loading} />
              </div>
            </div>
          )}

          {/* Jobs by status */}
          {!skeleton && cur && totalJobsInPeriod > 0 && (
            <div className={cn('rounded-xl border border-border bg-card p-5 space-y-3 transition-opacity', loading && 'opacity-60')}>
              <h2 className="text-sm font-semibold text-foreground">Jobs by Status</h2>
              <JobsStackedBar jobsByStatus={cur.jobsByStatus} loading={loading} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
