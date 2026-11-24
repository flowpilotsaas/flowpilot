import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export type Range = '7d' | '30d' | 'month' | 'year'

export type PeriodMetrics = {
  revenue: number
  estSent: number
  estApproved: number
  estPending: number
  estDeclined: number
  jobsCompleted: number
  newCustomers: number
  jobsByStatus: Record<string, number>
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
  const len = to.getTime() - from.getTime() + 86_400_000 // inclusive length
  return [new Date(from.getTime() - len), new Date(from.getTime() - 86_400_000)]
}

async function fetchMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  from: Date,
  to: Date,
): Promise<PeriodMetrics> {
  const f = ISO(from)
  const t = ISO(to)
  const fTs = from.toISOString()
  const tTs = new Date(to.getTime() + 86_400_000 - 1).toISOString() // end of day

  const [txRes, estRes, jobsRes, custRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, status')
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

  const transactions: { amount: number; status: string }[] = txRes.data ?? []
  const estimates: { status: string }[] = estRes.data ?? []
  const jobs: { status: string; price: number | null }[] = jobsRes.data ?? []
  const newCustomers: number = custRes.count ?? 0

  const revenue = transactions.reduce((s, t) => s + (t.amount ?? 0), 0)

  const estSent = estimates.filter((e) => e.status !== 'Draft').length
  const estApproved = estimates.filter((e) => e.status === 'Approved').length
  const estPending = estimates.filter((e) => e.status === 'Sent').length
  const estDeclined = estimates.filter((e) => e.status === 'Declined').length

  const jobsCompleted = jobs.filter((j) => j.status === 'Completed' || j.status === 'Paid').length

  const jobsByStatus: Record<string, number> = {}
  for (const j of jobs) {
    jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1
  }

  return {
    revenue,
    estSent,
    estApproved,
    estPending,
    estDeclined,
    jobsCompleted,
    newCustomers,
    jobsByStatus,
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
    fetchMetrics(supabase, member.organization_id, bounds[0], bounds[1]),
    fetchMetrics(supabase, member.organization_id, prevBounds[0], prevBounds[1]),
  ])

  return Response.json({ range, current, previous } satisfies SummaryResponse)
}
