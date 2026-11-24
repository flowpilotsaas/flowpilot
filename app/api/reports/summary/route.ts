import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export type Range = '7d' | '30d' | 'month' | 'year'

export type RevPoint = { label: string; value: number }

export type PeriodMetrics = {
  revenue: number
  estSent: number
  estApproved: number
  estPending: number
  estDeclined: number
  jobsCompleted: number
  newCustomers: number
  jobsByStatus: Record<string, number>
  revenueSeries: RevPoint[]
}

export type SummaryResponse = {
  range: Range
  current: PeriodMetrics
  previous: PeriodMetrics
}

const ISO = (d: Date) => d.toISOString().slice(0, 10)

function getRangeBounds(range: Range): [Date, Date] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (range) {
    case '7d':
      return [new Date(today.getTime() - 6 * 86_400_000), today]
    case '30d':
      return [new Date(today.getTime() - 29 * 86_400_000), today]
    case 'month':
      return [new Date(now.getFullYear(), now.getMonth(), 1), today]
    case 'year':
      return [new Date(now.getFullYear(), 0, 1), today]
  }
}

function getPrevBounds([from, to]: [Date, Date]): [Date, Date] {
  const len = to.getTime() - from.getTime() + 86_400_000
  return [new Date(from.getTime() - len), new Date(from.getTime() - 86_400_000)]
}

function buildRevenueSeries(
  transactions: { amount: number; date: string }[],
  from: Date,
  to: Date,
  range: Range,
): RevPoint[] {
  if (range === 'year') {
    const year = from.getFullYear()
    const buckets: Record<string, number> = {}
    for (let m = 0; m < 12; m++) {
      buckets[`${year}-${String(m + 1).padStart(2, '0')}`] = 0
    }
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7)
      if (key in buckets) buckets[key] += tx.amount
    }
    return Object.entries(buckets).map(([k, v]) => ({
      label: new Date(`${k}-01T12:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      value: v,
    }))
  }

  // Daily buckets
  const buckets: Record<string, number> = {}
  let cur = new Date(from)
  while (cur <= to) {
    buckets[ISO(cur)] = 0
    cur = new Date(cur.getTime() + 86_400_000)
  }
  for (const tx of transactions) {
    if (tx.date in buckets) buckets[tx.date] += tx.amount
  }
  return Object.entries(buckets).map(([k, v]) => ({
    label: new Date(`${k}T12:00:00Z`).toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    value: v,
  }))
}

async function fetchMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  from: Date,
  to: Date,
  range: Range,
): Promise<PeriodMetrics> {
  const f = ISO(from)
  const t = ISO(to)
  const fTs = from.toISOString()
  const tTs = new Date(to.getTime() + 86_400_000 - 1).toISOString()

  const [txRes, estRes, jobsRes, custRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, status, date')
      .eq('organization_id', orgId)
      .eq('status', 'paid')
      .gte('date', f)
      .lte('date', t),
    supabase
      .from('estimates')
      .select('status')
      .eq('organization_id', orgId)
      .gte('created_at', fTs)
      .lte('created_at', tTs),
    supabase
      .from('jobs')
      .select('status, price')
      .eq('organization_id', orgId)
      .gte('created_at', fTs)
      .lte('created_at', tTs),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', fTs)
      .lte('created_at', tTs),
  ])

  const transactions: { amount: number; status: string; date: string }[] = txRes.data ?? []
  const estimates: { status: string }[] = estRes.data ?? []
  const jobs: { status: string; price: number | null }[] = jobsRes.data ?? []
  const newCustomers: number = custRes.count ?? 0

  const revenue = transactions.reduce((s, tx) => s + (tx.amount ?? 0), 0)
  const estSent = estimates.filter((e) => e.status !== 'Draft').length
  const estApproved = estimates.filter((e) => e.status === 'Approved').length
  const estPending = estimates.filter((e) => e.status === 'Sent').length
  const estDeclined = estimates.filter((e) => e.status === 'Declined').length
  const jobsCompleted = jobs.filter((j) => j.status === 'Completed' || j.status === 'Paid').length

  const jobsByStatus: Record<string, number> = {}
  for (const j of jobs) jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1

  const revenueSeries = buildRevenueSeries(transactions, from, to, range)

  return {
    revenue, estSent, estApproved, estPending, estDeclined,
    jobsCompleted, newCustomers, jobsByStatus, revenueSeries,
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!member?.organization_id) {
    return Response.json({ error: 'No organization' }, { status: 403 })
  }

  const rawRange = req.nextUrl.searchParams.get('range') ?? '30d'
  const range: Range = (['7d', '30d', 'month', 'year'] as const).includes(rawRange as Range)
    ? (rawRange as Range)
    : '30d'

  const bounds = getRangeBounds(range)
  const prevBounds = getPrevBounds(bounds)

  const [current, previous] = await Promise.all([
    fetchMetrics(supabase, member.organization_id, bounds[0], bounds[1], range),
    fetchMetrics(supabase, member.organization_id, prevBounds[0], prevBounds[1], range),
  ])

  return Response.json({ range, current, previous } satisfies SummaryResponse)
}
