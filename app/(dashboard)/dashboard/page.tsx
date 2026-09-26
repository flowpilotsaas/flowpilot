'use client'

import * as React from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, Briefcase, FileText, Loader2,
  TrendingUp, CalendarDays, DollarSign, ChevronRight,
} from 'lucide-react'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const [email, setEmail]               = React.useState<string | null>(null)
  const [customerCount, setCustomerCount] = React.useState<number | null>(null)
  const [jobCount, setJobCount]           = React.useState<number | null>(null)
  const [estimateCount, setEstimateCount] = React.useState<number | null>(null)
  const [loading, setLoading]             = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)

      if (user) {
        const [custRes, jobRes, estRes] = await Promise.all([
          supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('estimates').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ])
        setCustomerCount(custRes.count ?? 0)
        setJobCount(jobRes.count ?? 0)
        setEstimateCount(estRes.count ?? 0)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    )
  }

  const displayName = email ? email.split('@')[0] : ''

  return (
    <div className="px-8 pt-10 pb-12 max-w-5xl mx-auto space-y-10">

      {/* Greeting */}
      <div>
        <p className="text-[13px] font-medium text-primary mb-0.5">
          {getGreeting()}{displayName ? `, ${displayName}` : ''}
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground leading-snug">
          Welcome to your dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Here&rsquo;s a quick overview of your business.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          label="Total Customers"
          value={customerCount !== null ? String(customerCount) : '—'}
          href="/dashboard/customers"
        />
        <StatCard
          icon={Briefcase}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/60"
          label="Total Jobs"
          value={jobCount !== null ? String(jobCount) : '—'}
          href="/dashboard/jobs"
        />
        <StatCard
          icon={FileText}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-950/60"
          label="Total Estimates"
          value={estimateCount !== null ? String(estimateCount) : '—'}
          href="/dashboard/estimates"
        />
      </div>

      {/* Quick access */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
          Quick access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {QUICK_LINKS.map(({ label, href, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary/30 hover:bg-accent/20 transition-all"
            >
              <span className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5 truncate">{desc}</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/70 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

const QUICK_LINKS = [
  { label: 'View schedule',    href: '/dashboard/schedule',       icon: CalendarDays, desc: 'Upcoming appointments and dispatch' },
  { label: 'Create estimate',  href: '/dashboard/estimates/new',  icon: FileText,     desc: 'Draft and send a quote to a customer' },
  { label: 'Browse customers', href: '/dashboard/customers',      icon: Users,        desc: 'Search and manage your contacts' },
  { label: 'Log a payment',    href: '/dashboard/transactions',   icon: DollarSign,   desc: 'Record revenue and track cash flow' },
  { label: 'Add a job',        href: '/dashboard/jobs',           icon: Briefcase,    desc: 'Create and track a work order' },
  { label: 'View reports',     href: '/dashboard/reports',        icon: TrendingUp,   desc: 'Track revenue and business trends' },
] as const

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  href,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  label: string
  value: string
  href: string
}) {
  return (
    <Link href={href} className="group block">
      <Card className="transition-shadow hover:shadow-sm">
        <CardContent className="pt-5 pb-5 flex flex-col gap-3">
          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <p className="text-[26px] font-bold tracking-tight text-foreground tabular-nums leading-none">
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
