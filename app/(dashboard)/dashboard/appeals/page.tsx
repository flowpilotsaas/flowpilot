'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Clock, CheckCircle2, XCircle } from 'lucide-react'

export default function AppealsPage() {
  const statCards = [
    { label: 'Pending',  value: 0, icon: Clock,          color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Approved', value: 0, icon: CheckCircle2,   color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Denied',   value: 0, icon: XCircle,        color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Appeals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track the status of your callback appeals</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Appeal History */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground">Appeal History</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">A record of all submitted appeals and their outcomes</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No appeals submitted yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Appeals you submit will appear here with their current status.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
