'use client'

import * as React from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle, Clock, CheckCircle2, UserCheck, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

type JobStatus = 'Scheduled' | 'In Progress' | 'Completed'

type Job = {
  id: string
  title: string
  status: JobStatus
  scheduled_date: string | null
  customers: { name: string; phone: string | null; address: string | null } | null
}

type Technician = {
  id: string
  name: string
  status: string
}

const STATUS_STYLES: Record<JobStatus, string> = {
  Scheduled:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed:    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500',
}

export default function DispatchPage() {
  const [jobs, setJobs]             = React.useState<Job[]>([])
  const [techs, setTechs]           = React.useState<Technician[]>([])
  const [loading, setLoading]       = React.useState(true)
  const [filter, setFilter]         = React.useState<'active' | 'all' | 'completed'>('active')

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [jobsRes, techsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, status, scheduled_date, customers(name, phone, address)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('team_members')
          .select('id, name, status')
          .eq('user_id', user.id)
          .eq('role', 'Technician'),
      ])

      if (jobsRes.data) setJobs(jobsRes.data as Job[])
      if (techsRes.data) setTechs(techsRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const unassigned     = jobs.filter((j) => j.status === 'Scheduled').length
  const inProgress     = jobs.filter((j) => j.status === 'In Progress').length
  const completedToday = jobs.filter((j) => j.status === 'Completed' && j.scheduled_date === today).length
  const availableTechs = techs.filter((t) => t.status === 'Active').length

  const filtered = React.useMemo(() => {
    if (filter === 'active')    return jobs.filter((j) => j.status === 'Scheduled' || j.status === 'In Progress')
    if (filter === 'completed') return jobs.filter((j) => j.status === 'Completed')
    return jobs
  }, [jobs, filter])

  const techJobCounts = React.useMemo(() => {
    const map: Record<string, number> = {}
    techs.forEach((t) => { map[t.id] = 0 })
    return map
  }, [techs])

  const statCards = [
    { label: 'Unassigned',       value: unassigned,     icon: AlertCircle,   color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'In Progress',      value: inProgress,     icon: Clock,         color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Completed Today',  value: completedToday, icon: CheckCircle2,  color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Available Techs',  value: availableTechs, icon: UserCheck,     color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dispatch Board</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage and assign jobs to your technicians</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {loading ? '—' : value}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Team Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : techs.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No technicians found. Add one in Team settings.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Technician</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Active Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {techs.map((tech) => (
                    <tr key={tech.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-3 font-medium text-foreground">{tech.name}</td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          tech.status === 'Active'
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        )}>
                          {tech.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground tabular-nums">
                        {techJobCounts[tech.id] ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Jobs</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="active">Active Jobs</option>
            <option value="all">All Jobs</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading jobs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Briefcase className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No jobs to display.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((job) => (
              <Card key={job.id} className="flex flex-col">
                <CardContent className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{job.title}</p>
                      {job.customers?.name && (
                        <p className="text-sm text-muted-foreground mt-0.5">{job.customers.name}</p>
                      )}
                    </div>
                    <span className={cn(
                      'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      STATUS_STYLES[job.status]
                    )}>
                      {job.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {job.customers?.address && (
                      <p className="truncate">{job.customers.address}</p>
                    )}
                    {job.customers?.phone && (
                      <p>{job.customers.phone}</p>
                    )}
                    {job.scheduled_date && (
                      <p>
                        {new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Technician: <span className="text-foreground">—</span></span>
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
