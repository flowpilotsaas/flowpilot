'use client'

/*
  SQL — run in Supabase SQL editor:

  create table public.transactions (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references auth.users(id) on delete cascade not null,
    job_id          uuid references public.jobs(id) on delete set null,
    customer_id     uuid references public.customers(id) on delete set null,
    customer_name   text,
    job_number      text,
    amount          numeric(10,2) not null default 0,
    payment_method  text,
    status          text not null default 'paid',
    type            text not null default 'payment',
    details         text,
    date            date not null,
    created_at      timestamptz not null default now()
  );

  alter table public.transactions enable row level security;

  create policy "transactions: owner full access"
    on public.transactions for all
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);

  grant all on public.transactions to anon, authenticated;
*/

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, DollarSign, Loader2, FileText, Users, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

type DateFilter = 'day' | 'week' | 'month' | 'custom'

type Transaction = {
  id: string
  job_id: string | null
  customer_id: string | null
  customer_name: string | null
  job_number: string | null
  amount: number
  payment_method: string | null
  status: string
  type: string
  details: string | null
  date: string
  created_at: string
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Returns the inclusive [from, to] ISO date strings for the current filter
function getDateBounds(
  filter: DateFilter,
  fromDate: string,
  toDate: string,
): { from: string; to: string } | null {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const today = new Date()

  if (filter === 'day') {
    const t = iso(today)
    return { from: t, to: t }
  }
  if (filter === 'week') {
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return { from: iso(start), to: iso(today) }
  }
  if (filter === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: iso(start), to: iso(today) }
  }
  // custom — only apply if both dates are set
  if (fromDate && toDate) return { from: fromDate, to: toDate }
  if (fromDate) return { from: fromDate, to: iso(today) }
  return null // no filter when custom dates aren't set
}

export default function TransactionsPage() {
  const [loading, setLoading]       = React.useState(true)
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('month')
  const [search, setSearch]         = React.useState('')
  const [fromDate, setFromDate]     = React.useState('')
  const [toDate, setToDate]         = React.useState('')

  // Other stats (unchanged from jobs / estimates / customers tables)
  const [estimatesCount, setEstimatesCount] = React.useState(0)
  const [customersCount, setCustomersCount] = React.useState(0)
  const [activeJobs, setActiveJobs]         = React.useState(0)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [txRes, estRes, custRes, jobsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('estimates')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('jobs')
          .select('status')
          .eq('user_id', user.id),
      ])

      if (txRes.data) setTransactions(txRes.data as Transaction[])
      if (estRes.count !== null)  setEstimatesCount(estRes.count)
      if (custRes.count !== null) setCustomersCount(custRes.count)
      if (jobsRes.data) {
        setActiveJobs(jobsRes.data.filter((j) => j.status !== 'Completed' && j.status !== 'Paid').length)
      }

      setLoading(false)
    }
    load()
  }, [])

  // ── Filtered transactions ──────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const bounds = getDateBounds(dateFilter, fromDate, toDate)
    const q = search.toLowerCase().trim()

    return transactions.filter((tx) => {
      if (bounds) {
        if (tx.date < bounds.from || tx.date > bounds.to) return false
      }
      if (q) {
        const haystack = [
          tx.customer_name ?? '',
          tx.job_number ?? '',
          tx.details ?? '',
          tx.payment_method ?? '',
          tx.type,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [transactions, dateFilter, fromDate, toDate, search])

  const totalAmount = React.useMemo(
    () => filtered.reduce((sum, tx) => sum + tx.amount, 0),
    [filtered],
  )

  // ── Period label for the banner ────────────────────────────────────────

  const periodLabel =
    dateFilter === 'day'   ? 'Today' :
    dateFilter === 'week'  ? 'Last 7 days' :
    dateFilter === 'month' ? 'This month' : 'Custom range'

  // ── Stat cards ─────────────────────────────────────────────────────────

  const statCards = [
    {
      label: 'Customer Payments',
      value: loading ? '—' : fmtCurrency(totalAmount),
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Estimates Sent',
      value: loading ? '—' : estimatesCount,
      icon: FileText,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Total Customers',
      value: loading ? '—' : customersCount,
      icon: Users,
      color: 'text-pink-500',
      bg: 'bg-pink-50 dark:bg-pink-900/20',
    },
    {
      label: 'Active Jobs',
      value: loading ? '—' : activeJobs,
      icon: Briefcase,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track customer payments and income activity</p>
      </div>

      {/* Net movement banner */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{periodLabel}</p>
            <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
              {loading ? '—' : fmtCurrency(totalAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Net Movement</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(['day', 'week', 'month', 'custom'] as DateFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDateFilter(f)}
              className={cn(
                'px-3 py-1.5 capitalize transition-colors',
                dateFilter === f
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {dateFilter === 'custom' && (
          <>
            <Input type="date" className="w-36" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" className="w-36" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </>
        )}
      </div>

      {/* Table */}
      <Card className="py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Date', 'Type', 'Job #', 'Customer', 'Details', 'Status', 'Payment Method', 'Amount'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <DollarSign className="w-10 h-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {search ? 'No transactions match your search.' : 'No transactions recorded yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(tx.date)}</td>
                    <td className="px-6 py-3 capitalize text-foreground whitespace-nowrap">{tx.type}</td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {tx.job_number ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-foreground whitespace-nowrap">
                      {tx.customer_name ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground max-w-[14rem] truncate" title={tx.details ?? ''}>
                      {tx.details ?? '—'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                      {tx.payment_method ?? '—'}
                    </td>
                    <td className="px-6 py-3 font-medium text-foreground tabular-nums whitespace-nowrap">
                      {fmtCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
