'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, DollarSign, Loader2, FileText, Users, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

type DateFilter = 'day' | 'week' | 'month' | 'custom'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function TransactionsPage() {
  const [loading, setLoading]         = React.useState(true)
  const [dateFilter, setDateFilter]   = React.useState<DateFilter>('month')
  const [search, setSearch]           = React.useState('')
  const [fromDate, setFromDate]       = React.useState('')
  const [toDate, setToDate]           = React.useState('')

  // Real stats
  const [jobsRevenue, setJobsRevenue]         = React.useState(0)
  const [estimatesCount, setEstimatesCount]   = React.useState(0)
  const [customersCount, setCustomersCount]   = React.useState(0)
  const [activeJobs, setActiveJobs]           = React.useState(0)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [jobsRes, estRes, custRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('status, price')
          .eq('user_id', user.id),
        supabase
          .from('estimates')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      if (jobsRes.data) {
        const completed = jobsRes.data.filter((j) => j.status === 'Completed')
        const active    = jobsRes.data.filter((j) => j.status !== 'Completed')
        setJobsRevenue(completed.reduce((sum, j) => sum + (j.price ?? 0), 0))
        setActiveJobs(active.length)
      }
      if (estRes.count !== null)  setEstimatesCount(estRes.count)
      if (custRes.count !== null) setCustomersCount(custRes.count)

      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Customer Payments',  value: '$0.00',                         icon: DollarSign, color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Total Jobs Revenue', value: loading ? '—' : fmtCurrency(jobsRevenue), icon: Briefcase,  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Estimates Sent',     value: loading ? '—' : estimatesCount,  icon: FileText,   color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Total Customers',    value: loading ? '—' : customersCount,  icon: Users,      color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { label: 'Active Jobs',        value: loading ? '—' : activeJobs,      icon: Briefcase,  color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
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
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">This month</p>
            <p className="text-3xl font-bold text-foreground mt-1">$0.00</p>
            <p className="text-xs text-muted-foreground mt-0.5">Net Movement</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
        {/* Period buttons */}
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
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9" placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Date range (shown for custom) */}
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
                  <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    {loading
                      ? <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin" />
                      : <DollarSign className="w-10 h-10 text-muted-foreground/30" />}
                    <p className="text-sm text-muted-foreground">
                      {loading ? 'Loading…' : 'No income activity found.'}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
