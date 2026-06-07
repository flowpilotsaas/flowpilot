'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Briefcase, BarChart2, Activity, FileText, CheckSquare, TrendingUp,
  CreditCard, ClipboardList, Clock, Receipt, Wrench, DollarSign,
  Package, Phone,
} from 'lucide-react'

type ReportCard = {
  title: string
  icon: React.ElementType
  color: string
  bg: string
}

const REPORTS: ReportCard[] = [
  { title: 'Jobs',                icon: Briefcase,    color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { title: 'Job Statistics',      icon: BarChart2,    color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { title: 'Activity',            icon: Activity,     color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
  { title: 'Aging Invoices',      icon: Clock,        color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { title: 'Tasks',               icon: CheckSquare,  color: 'text-teal-500',   bg: 'bg-teal-50 dark:bg-teal-900/20' },
  { title: 'Sales',               icon: TrendingUp,   color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { title: 'Payments',            icon: CreditCard,   color: 'text-sky-500',    bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { title: 'Estimates',           icon: ClipboardList,color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  { title: 'Timesheets',          icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { title: 'Tax',                 icon: Receipt,      color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20' },
  { title: 'Equipment',           icon: Wrench,       color: 'text-stone-500',  bg: 'bg-stone-50 dark:bg-stone-900/20' },
  { title: 'Tips',                icon: DollarSign,   color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { title: 'Expenses',            icon: FileText,     color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-900/20' },
  { title: 'Invoices',            icon: FileText,     color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { title: 'Items and Services',  icon: Package,      color: 'text-cyan-500',   bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  { title: 'Call Tracking',       icon: Phone,        color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20' },
]

export default function ReportsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse reports for your business</p>
      </div>

      {/* Report grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {REPORTS.map(({ title, icon: Icon, color, bg }) => (
          <Card
            key={title}
            className="group cursor-pointer hover:shadow-md transition-shadow"
          >
            <a href="#" onClick={(e) => e.preventDefault()}>
              <CardContent className="p-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                    View report →
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </CardContent>
            </a>
          </Card>
        ))}
      </div>
    </div>
  )
}
